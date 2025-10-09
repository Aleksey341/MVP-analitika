// server.js
'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const ExcelJS = require('exceljs');

const { pool, poolRO } = require('./config/database');
const { requireAuth, requireAdmin, requireMunicipalityAccess } = require('./middleware/auth');

const app = express();
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT || 8080);

/* ----------------------- пути фронта ----------------------- */
const FRONT_DIST = path.join(__dirname, 'frontend', 'dist');
const INDEX_HTML = path.join(FRONT_DIST, 'index.html');

/* ----------------------- утилиты ----------------------- */
function logSql(tag, sql, params = []) {
  console.log(`[SQL][${tag}] ${sql.replace(/\s+/g, ' ').trim()}`);
  if (params && params.length) console.log(`[SQL][${tag}] params:`, params);
}
{
  "scripts": {
    "start": "node server.js"
  }
}

/* --------------------- системные мидлы --------------------- */
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        scriptSrcAttr: ["'unsafe-inline'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    referrerPolicy: { policy: 'no-referrer' },
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Превышен лимит запросов. Попробуйте позже.',
  })
);

// CORS
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : (origin, cb) => cb(null, origin || true),
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(
  session({
    name: 'sid',
    secret: process.env.SESSION_SECRET || 'change-me-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 2 * 60 * 60 * 1000,
    },
  })
);

/* -------------------- лог запросов -------------------- */
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url} - ${req.ip}`);
  if (req.path.startsWith('/api/')) console.log('[DEBUG] API hit →', req.method, req.originalUrl);
  next();
});

/* ------------------ autodetect таблиц БД ------------------ */
const DB = {
  indicatorsCatalog: null,   // public.indicators_catalog | public.indicators
  indicatorValues: null,     // public.indicator_values
  servicesCatalog: null,     // public.services_catalog
  serviceValues: null,       // public.service_values
};

async function resolveTables() {
  try {
    const q = `
      SELECT
        to_regclass('public.indicators_catalog') AS icatalog,
        to_regclass('public.indicators')         AS indicators,
        to_regclass('public.indicator_values')   AS ivalues,
        to_regclass('public.services_catalog')   AS scatalog,
        to_regclass('public.service_values')     AS svalues
    `;
    const { rows } = await pool.query(q);
    const r = rows[0] || {};
    DB.indicatorsCatalog = r.icatalog ? 'public.indicators_catalog' : (r.indicators ? 'public.indicators' : null);
    DB.indicatorValues   = r.ivalues ? 'public.indicator_values' : null;
    DB.servicesCatalog   = r.scatalog ? 'public.services_catalog' : null;
    DB.serviceValues     = r.svalues ? 'public.service_values' : null;
    console.log('DB mapping:', DB);
  } catch (e) {
    console.error('Failed to resolve tables on startup:', e);
  }
}
resolveTables();

/* ================== служебные эндпоинты (до API/статики) ================== */
app.get('/ping', (_req, res) => res.send('PONG from mvp-analitika server!'));

// health (два алиаса: /health и /api/health)
async function healthHandler(_req, res) {
  try {
    await pool.query('SELECT 1');
    await poolRO.query('SELECT 1');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: '1.1.3-spa-debug',
      frontend_built: fs.existsSync(INDEX_HTML),
      frontend_path: INDEX_HTML,
      db_mapping: DB,
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ status: 'unhealthy', timestamp: new Date().toISOString(), error: error.message });
  }
}
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

/* ============================ API ============================ */
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const gibddRoutes = require('./routes/gibdd');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/gibdd', gibddRoutes);

try {
  const servicesDashboardRoutes = require('./routes/services');
  app.use('/api/services-dashboard', servicesDashboardRoutes);
  console.log('✅ Services dashboard routes registered');
} catch (err) {
  console.error('❌ Failed to load services dashboard routes:', err.message);
}

/* ---- Справочник услуг ---- */
app.get('/api/services-catalog', requireAuth, async (_req, res, next) => {
  try {
    const sql = `
      SELECT id, name, category, description
      FROM services_catalog
      ORDER BY category, name`;
    const { rows } = await poolRO.query(sql);
    res.json(rows);
  } catch (err) { next(err); }
});

/* ---- Значения услуг (чтение) ---- */
app.get('/api/service-values', requireAuth, async (req, res, next) => {
  try {
    const { year, month, municipality_id } = req.query;
    if (!year || !month || !municipality_id) {
      return res.status(400).json({ error: 'bad_request', message: 'Параметры year, month и municipality_id обязательны' });
    }
    const sql = `
      SELECT service_id, value_numeric
      FROM service_values
      WHERE period_year=$1 AND period_month=$2 AND municipality_id=$3
    `;
    const { rows } = await poolRO.query(sql, [Number(year), Number(month), Number(municipality_id)]);
    res.json(rows);
  } catch (err) { next(err); }
});

/* ---- Муниципалитеты ---- */
app.get('/api/municipalities', async (_req, res, next) => {
  try {
    const sql = 'SELECT id, name FROM public.municipalities ORDER BY name';
    logSql('municipalities', sql);
    const { rows } = await poolRO.query(sql);
    res.json(rows);
  } catch (err) { next(err); }
});

/* ---- Все муниципалитеты (без авторизации) ---- */
app.get('/api/municipalities/all', async (_req, res, next) => {
  try {
    const sql = 'SELECT id, name FROM public.municipalities ORDER BY name';
    logSql('municipalities-all', sql);
    const { rows } = await poolRO.query(sql);
    res.json(rows);
  } catch (err) { next(err); }
});

/* ---- Муниципалитеты пользователя ---- */
app.get('/api/my/municipalities', requireAuth, async (req, res, next) => {
  try {
    const user = req.session.user;
    if (user.role === 'admin') {
      const { rows } = await poolRO.query('SELECT id, name FROM public.municipalities ORDER BY name');
      return res.json(rows);
    }
    if (!user.municipality_id) return res.json([]);
    const sql = `
      SELECT id, name FROM public.municipalities
      WHERE id=$1 ORDER BY name`;
    const { rows } = await poolRO.query(sql, [user.municipality_id]);
    res.json(rows);
  } catch (err) { next(err); }
});

/* ---- Индикаторы ---- */
app.get('/api/indicators/form_1_gmu', async (_req, res, next) => {
  try {
    if (!DB.indicatorsCatalog) return res.status(500).json({ error: 'Catalog table not found' });
    const sql = `
      SELECT id, code, name, unit
      FROM ${DB.indicatorsCatalog}
      WHERE form_code='form_1_gmu'
      ORDER BY sort_order NULLS LAST, id`;
    const { rows } = await poolRO.query(sql);
    res.json(rows);
  } catch (err) { next(err); }
});

app.get('/api/indicators/:formCode', async (req, res, next) => {
  try {
    if (!DB.indicatorsCatalog) return res.status(500).json({ error: 'Catalog table not found' });
    const { formCode } = req.params;
    const sql = `
      SELECT id, code, name, unit
      FROM ${DB.indicatorsCatalog}
      WHERE form_code=$1
      ORDER BY sort_order NULLS LAST, id`;
    const { rows } = await poolRO.query(sql, [formCode]);
    res.json(rows);
  } catch (err) { next(err); }
});

/* ---- Дашборд (старый по indicator_values) ---- */
app.get('/api/dashboard/data', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    if (!DB.indicatorValues) {
      const byMonth = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total_value: 0, records: 0 }));
      return res.json({ year, byMonth });
    }
    const sql = `
      SELECT period_month AS month,
             COALESCE(SUM(value_numeric),0) AS total_value,
             COUNT(*) AS records
      FROM ${DB.indicatorValues}
      WHERE period_year=$1
      GROUP BY period_month
      ORDER BY period_month`;
    const { rows } = await poolRO.query(sql, [year]);
    const byMonth = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const r = rows.find(x => Number(x.month) === m);
      return { month: m, total_value: r ? Number(r.total_value) : 0, records: r ? Number(r.records) : 0 };
    });
    res.json({ year, byMonth });
  } catch (err) { next(err); }
});

/* ---- Статистика ---- */
app.get('/api/stats', async (_req, res, next) => {
  try {
    const promises = [poolRO.query('SELECT COUNT(*)::int AS cnt FROM public.municipalities')];
    if (DB.indicatorValues) promises.push(poolRO.query(`SELECT COUNT(*)::int AS cnt FROM ${DB.indicatorValues}`));
    else promises.push(Promise.resolve({ rows: [{ cnt: 0 }] }));
    const [m, v] = await Promise.all(promises);
    res.json({ municipalities: m.rows[0].cnt, indicator_values: v.rows[0].cnt });
  } catch (err) { next(err); }
});

/* =================== СЕРВИСЫ (новые API) =================== */
app.get('/api/service-categories', async (_req, res, next) => {
  try {
    if (!DB.servicesCatalog) return res.json([]);
    const sql = `
      SELECT COALESCE(category,'') AS category, COUNT(*)::int AS cnt
      FROM ${DB.servicesCatalog}
      GROUP BY 1
      ORDER BY 1`;
    const { rows } = await poolRO.query(sql);
    res.json(rows);
  } catch (err) { next(err); }
});

app.get('/api/services', async (req, res, next) => {
  try {
    if (!DB.servicesCatalog) return res.json([]);
    const { category } = req.query;
    let sql = `
      SELECT id, code, name, unit, category
      FROM ${DB.servicesCatalog}`;
    const params = [];
    if (category) { sql += ` WHERE category=$1`; params.push(category); }
    sql += ` ORDER BY COALESCE(category,''), name`;
    const { rows } = await poolRO.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

app.get('/api/services/:id/monthly', async (req, res, next) => {
  try {
    if (!DB.serviceValues) {
      return res.json({
        serviceId: Number(req.params.id),
        year: Number(req.query.year) || new Date().getFullYear(),
        byMonth: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, total: 0 })),
      });
    }
    const serviceId = Number(req.params.id);
    const year = Number(req.query.year) || new Date().getFullYear();
    const sql = `
      SELECT period_month AS month, SUM(value_numeric) AS total
      FROM ${DB.serviceValues}
      WHERE service_id=$1 AND period_year=$2
      GROUP BY period_month
      ORDER BY period_month`;
    const { rows } = await poolRO.query(sql, [serviceId, year]);
    const byMonth = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const r = rows.find(x => Number(x.month) === m);
      return { month: m, total: r ? Number(r.total) : 0 };
    });
    res.json({ serviceId, year, byMonth });
  } catch (err) { next(err); }
});

app.get('/api/services/:id/details', async (req, res, next) => {
  try {
    if (!DB.serviceValues) {
      return res.json({
        serviceId: Number(req.params.id),
        year: Number(req.query.year) || new Date().getFullYear(),
        rows: [],
      });
    }
    const serviceId = Number(req.params.id);
    const year = Number(req.query.year) || new Date().getFullYear();
    const sql = `
      SELECT m.id AS municipality_id, m.name, sv.period_month, sv.value_numeric
      FROM ${DB.serviceValues} sv
      JOIN public.municipalities m ON m.id = sv.municipality_id
      WHERE sv.service_id=$1 AND sv.period_year=$2
      ORDER BY m.name, sv.period_month`;
    const { rows } = await poolRO.query(sql, [serviceId, year]);
    res.json({ serviceId, year, rows });
  } catch (err) { next(err); }
});

app.get('/api/dashboard/recent-updates', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const municipalityId = req.query.municipality_id ? Number(req.query.municipality_id) : null;
    const serviceId = req.query.service_id ? Number(req.query.service_id) : null;
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const updates = [];

    if (DB.indicatorValues && DB.indicatorsCatalog) {
      let sql = `
        SELECT m.name AS municipality, ic.name AS item_name,
               iv.period_year, iv.period_month, iv.value_numeric AS value,
               iv.updated_at, iv.created_at
        FROM ${DB.indicatorValues} iv
        JOIN public.municipalities m ON m.id = iv.municipality_id
        JOIN ${DB.indicatorsCatalog} ic ON ic.id = iv.indicator_id
        WHERE iv.period_year=$1`;
      const params = [year];
      let p = 2;
      if (municipalityId) { sql += ` AND iv.municipality_id=$${p++}`; params.push(municipalityId); }
      sql += ` ORDER BY iv.updated_at DESC LIMIT $${p}`; params.push(limit);
      const { rows } = await poolRO.query(sql, params);
      for (const r of rows) {
        updates.push({
          municipality: r.municipality,
          item_name: r.item_name,
          period_year: Number(r.period_year),
          period_month: Number(r.period_month),
          value: Number(r.value) || 0,
          updated_at: r.updated_at,
          is_new: r.created_at && r.updated_at && +new Date(r.created_at) === +new Date(r.updated_at)
        });
      }
    }

    if (DB.serviceValues && DB.servicesCatalog) {
      let sql = `
        SELECT m.name AS municipality, sc.name AS item_name,
               sv.period_year, sv.period_month, sv.value_numeric AS value,
               sv.updated_at, sv.created_at
        FROM ${DB.serviceValues} sv
        JOIN public.municipalities m ON m.id = sv.municipality_id
        JOIN ${DB.servicesCatalog} sc ON sc.id = sv.service_id
        WHERE sv.period_year=$1`;
      const params = [year];
      let p = 2;
      if (municipalityId) { sql += ` AND sv.municipality_id=$${p++}`; params.push(municipalityId); }
      if (serviceId) { sql += ` AND sv.service_id=$${p++}`; params.push(serviceId); }
      sql += ` ORDER BY sv.updated_at DESC LIMIT $${p}`; params.push(limit);
      const { rows } = await poolRO.query(sql, params);
      for (const r of rows) {
        updates.push({
          municipality: r.municipality,
          item_name: r.item_name,
          period_year: Number(r.period_year),
          period_month: Number(r.period_month),
          value: Number(r.value) || 0,
          updated_at: r.updated_at,
          is_new: r.created_at && r.updated_at && +new Date(r.created_at) === +new Date(r.updated_at)
        });
      }
    }

    updates.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    res.json(updates.slice(0, limit));
  } catch (err) { next(err); }
});

/* ---------- Импорт JSON/Excel ---------- */
function requireImportAuth(req, res, next) {
  if (process.env.IMPORT_ENABLED !== 'true') return res.status(403).json({ error: 'Import disabled' });
  const token = req.headers['x-import-token'];
  if (!token || token !== process.env.IMPORT_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

/* импорт справочника услуг (UPSERT по code) */
app.post('/api/import/services-catalog', requireImportAuth, async (req, res, next) => {
  try {
    if (!DB.servicesCatalog) return res.status(500).json({ error: 'services_catalog not found' });
    const items = Array.isArray(req.body) ? req.body : [];
    if (!items.length) return res.json({ inserted: 0, updated: 0 });

    const cols = ['code', 'name', 'unit', 'category'];
    const values = [];
    const params = [];
    let p = 1;
    for (const it of items) {
      values.push(`($${p++}, $${p++}, $${p++}, $${p++})`);
      params.push((it.code || '').trim(), (it.name || '').trim(), (it.unit || '').trim(), (it.category || '').trim());
    }
    const sql = `
      INSERT INTO ${DB.servicesCatalog} (${cols.join(', ')})
      VALUES ${values.join(', ')}
      ON CONFLICT (code) DO UPDATE
      SET name=EXCLUDED.name,
          unit=COALESCE(NULLIF(EXCLUDED.unit,''), ${DB.servicesCatalog}.unit),
          category=COALESCE(NULLIF(EXCLUDED.category,''), ${DB.servicesCatalog}.category)
      RETURNING xmax <> 0 AS updated`;
    const { rows } = await poolRO.query(sql, params);
    const updated = rows.filter(r => r.updated).length;
    res.json({ inserted: rows.length - updated, updated });
  } catch (err) { next(err); }
});

/* импорт значений из Excel (indicator_values) */
const upload = multer({ dest: 'uploads/' });

app.post('/api/import/service-values', requireAuth, requireMunicipalityAccess, upload.single('file'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    if (!req.file) { client.release(); return res.status(400).json({ error: 'Файл не загружен' }); }

    const { municipality_id, period_year, period_month, service_id, service_name } = req.body;
    if (!municipality_id || !period_year || !period_month) { client.release(); return res.status(400).json({ error: 'Отсутствуют параметры' }); }
    if (!service_id) { client.release(); return res.status(400).json({ error: 'Не указана услуга (service_id)' }); }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) { client.release(); return res.status(400).json({ error: 'Excel файл пуст' }); }

    const indicatorsRes = await poolRO.query(`
      SELECT id, code, name FROM ${DB.indicatorsCatalog} WHERE form_code='form_1_gmu'
    `);
    const indicatorsByCode = new Map(indicatorsRes.rows.map(r => [r.code.trim().toLowerCase(), r]));
    const indicatorsByName = new Map(indicatorsRes.rows.map(r => [r.name.trim().toLowerCase(), r]));

    const vals = [];
    const params = [];
    let p = 1;
    let rowCount = 0;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 2) return;
      const cellA = row.getCell(1).value; // Код
      const cellC = row.getCell(3).value; // Наименование
      if (!cellA && !cellC) return;

      let value = null;
      for (let col = 5; col <= 10; col++) {
        const v = row.getCell(col).value;
        if (v != null && !isNaN(Number(v))) { value = Number(v); break; }
      }
      if (value === null) return;

      const keyByCode = cellA ? String(cellA).trim().toLowerCase() : null;
      const keyByName = cellC ? String(cellC).trim().toLowerCase() : null;

      let indicator = null;
      if (keyByCode) indicator = indicatorsByCode.get(keyByCode);
      if (!indicator && keyByName) indicator = indicatorsByName.get(keyByName);

      if (indicator) {
        vals.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++})`);
        params.push(municipality_id, service_id, indicator.id, period_year, period_month, value);
        rowCount++;
      }
    });

    if (!vals.length) { client.release(); return res.json({ upserted: 0, message: 'Не найдено совпадений с показателями' }); }

    const sql = `
      INSERT INTO ${DB.indicatorValues}
        (municipality_id, service_id, indicator_id, period_year, period_month, value_numeric)
      VALUES ${vals.join(', ')}
      ON CONFLICT (municipality_id, indicator_id, period_year, period_month)
      DO UPDATE SET value_numeric=EXCLUDED.value_numeric, service_id=EXCLUDED.service_id, updated_at=CURRENT_TIMESTAMP`;
    await client.query('BEGIN');
    const result = await client.query(sql, params);
    await client.query('COMMIT');
    client.release();

    res.json({ upserted: result.rowCount, message: `Импортировано ${rowCount} строк для услуги ${service_name || service_id}` });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    client.release();
    next(err);
  }
});

/* ---------- Экспорт отчёта в Excel ---------- */
app.post('/api/reports/export', requireAuth, requireMunicipalityAccess, async (req, res, next) => {
  try {
    const { municipality_id, period_year, period_month } = req.body;
    if (!municipality_id || !period_year || !period_month) {
      return res.status(400).json({ error: 'Отсутствуют параметры: municipality_id, period_year, period_month' });
    }

    const muniRes = await poolRO.query('SELECT name FROM public.municipalities WHERE id=$1', [municipality_id]);
    const muniName = muniRes.rows[0]?.name || 'Неизвестно';

    let data = [];
    if (DB.indicatorsCatalog && DB.indicatorValues) {
      const sql = `
        SELECT ic.code, ic.name, ic.unit, COALESCE(iv.value_numeric,0) AS value
        FROM ${DB.indicatorsCatalog} ic
        LEFT JOIN ${DB.indicatorValues} iv
          ON iv.indicator_id=ic.id AND iv.municipality_id=$1 AND iv.period_year=$2 AND iv.period_month=$3
        WHERE ic.form_code='form_1_gmu'
        ORDER BY ic.sort_order NULLS LAST, ic.id`;
      const result = await poolRO.query(sql, [municipality_id, period_year, period_month]);
      data = result.rows;
    }
    if (!data.length) return res.status(404).json({ error: 'Нет данных для экспорта' });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Отчет 1-ГМУ');

    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = `Форма 1-ГМУ - ${muniName}`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:D2');
    worksheet.getCell('A2').value = `Период: ${String(period_month).padStart(2, '0')}.${period_year}`;
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.getRow(4).values = ['№', 'Показатель', 'Единица измерения', 'Значение'];
    worksheet.getRow(4).font = { bold: true };
    worksheet.getRow(4).alignment = { horizontal: 'center' };

    data.forEach((row, idx) => worksheet.addRow([idx + 1, row.name, row.unit, row.value]));

    worksheet.getColumn(1).width = 8;
    worksheet.getColumn(2).width = 50;
    worksheet.getColumn(3).width = 20;
    worksheet.getColumn(4).width = 15;

    const borderStyle = { style: 'thin', color: { argb: 'FF000000' } };
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber >= 4) {
        row.eachCell(cell => {
          cell.border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };
        });
      }
    });

    const fileName = `Report_${muniName.replace(/\s+/g, '_')}_${period_year}_${String(period_month).padStart(2, '0')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

/* ---------- Сохранение отчёта ---------- */
app.post('/api/reports/save', requireAuth, requireMunicipalityAccess, async (req, res, next) => {
  const client = await pool.connect();
  try {
    if (!DB.indicatorValues) { client.release(); return res.status(500).json({ error: 'indicator_values table not found' }); }

    const { municipality_id, period_year, period_month, values } = req.body;
    if (!municipality_id || !period_year || !period_month) { client.release(); return res.status(400).json({ error: 'Отсутствуют обязательные поля' }); }
    if (!Array.isArray(values) || !values.length) { client.release(); return res.status(400).json({ error: 'Массив values пуст' }); }

    const vals = [];
    const params = [];
    let p = 1;
    for (const item of values) {
      const indicatorId = Number(item.indicator_id);
      const value = item.value == null ? null : Number(item.value);
      if (!indicatorId) continue;
      vals.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++})`);
      params.push(municipality_id, indicatorId, period_year, period_month, value);
    }
    if (!vals.length) { client.release(); return res.status(400).json({ error: 'Нет валидных данных для сохранения' }); }

    const sql = `
      INSERT INTO ${DB.indicatorValues}
        (municipality_id, indicator_id, period_year, period_month, value_numeric)
      VALUES ${vals.join(', ')}
      ON CONFLICT (municipality_id, indicator_id, period_year, period_month)
      DO UPDATE SET value_numeric=EXCLUDED.value_numeric`;
    await client.query('BEGIN');
    const result = await client.query(sql, params);
    await client.query('COMMIT');
    client.release();

    res.json({ success: true, saved: result.rowCount, message: `Сохранено ${vals.length} значений показателей` });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    client.release();
    next(err);
  }
});

/* ============================ DEBUG ============================ */
app.get('/api/debug/routes', (_req, res) => {
  const routes = [];
  app._router.stack.forEach((m) => {
    if (m.route && m.route.path) {
      const methods = Object.keys(m.route.methods).filter(k => m.route.methods[k]).join(',').toUpperCase();
      routes.push({ method: methods, path: m.route.path });
    }
  });
  res.json({ routes, db_mapping: DB });
});

app.get('/api/debug/frontend', (_req, res) => {
  let distContents = [];
  try {
    if (fs.existsSync(FRONT_DIST)) distContents = fs.readdirSync(FRONT_DIST);
  } catch (e) { distContents = ['Error: ' + e.message]; }
  res.json({
    __dirname,
    FRONT_DIST,
    INDEX_HTML,
    distExists: fs.existsSync(FRONT_DIST),
    indexExists: fs.existsSync(INDEX_HTML),
    distContents,
    nodeVersion: process.version,
    cwd: process.cwd(),
  });
});

/* ============================ СТАТИКА ============================ */
// опциональная папка public
app.use(express.static(path.join(__dirname, 'public')));
// сборка фронта
app.use(express.static(FRONT_DIST));

/* ============================ SPA FALLBACK ============================ */
/* Важно: только для НЕ-/api/* */
app.get(/^(?!\/api\/).*/, (_req, res) => {
  if (!fs.existsSync(INDEX_HTML)) {
    console.error('[SPA Fallback] index.html NOT FOUND at', INDEX_HTML);
    return res.status(404).send(
      `<h1>React app not built</h1>
       <p>Run: <code>npm --prefix frontend run build</code></p>
       <p>Looking for: ${INDEX_HTML}</p>`
    );
  }
  res.sendFile(INDEX_HTML);
});

/* ============================ ГЛОБАЛЬНЫЕ ОШИБКИ ============================ */
app.use((err, _req, res, _next) => {
  console.error('Global error handler:', err);
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Внутренняя ошибка сервера',
    ...(isDev && { stack: err.stack }),
  });
});

/* ============================ ГРЕЙСФУЛ ШАТДАУН ============================ */
async function shutdown(signal) {
  console.log(`${signal} получен. Завершение работы...`);
  try { await pool.end(); await poolRO.end(); } finally { process.exit(0); }
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

/* ============================ ЗАПУСК ============================ */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📊 Дашборд: http://localhost:${PORT}/dashboard`);
  console.log(`📝 Форма:   http://localhost:${PORT}/form`);
  console.log(`❤️ Health:  http://localhost:${PORT}/health`);
});

