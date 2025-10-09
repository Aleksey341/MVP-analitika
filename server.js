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

/* ----------------------- утилиты ----------------------- */
const FRONT_DIST = path.join(__dirname, 'frontend', 'dist');
const INDEX_HTML = path.join(FRONT_DIST, 'index.html');

function logSql(tag, sql, params = []) {
  console.log(`[SQL][${tag}] ${sql.replace(/\s+/g, ' ').trim()}`);
  if (params && params.length) console.log(`[SQL][${tag}] params:`, params);
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

// CORS: если задан CORS_ORIGINS — белый список, иначе — отражаем Origin
const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length
      ? corsOrigins
      : (origin, cb) => cb(null, origin || true),
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
  if (req.path.startsWith('/api/')) {
    console.log('[DEBUG] API hit →', req.method, req.originalUrl);
  }
  next();
});

/* ------------------ autodetect таблиц БД ------------------ */
const DB = {
  indicatorsCatalog: null,
  indicatorValues: null,
  servicesCatalog: null,
  serviceValues: null,
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

// health в двух вариантах: /health и /api/health
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

/* --- примеры API из проекта (оставлены как были) --- */
app.get('/api/services-catalog', requireAuth, async (_req, res, next) => {
  try {
    const sql = `SELECT id, name, category, description FROM services_catalog ORDER BY category, name`;
    const { rows } = await poolRO.query(sql);
    res.json(rows);
  } catch (err) { next(err); }
});

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

/* --------- импорт/экспорт/отчёты и прочие маршруты (как были) --------- */
// ... весь ваш остальной код API (reports/export, reports/save, indicators, services, dashboard и т.д.)
// Я оставил его без изменений по смыслу; порядок не критичен, пока он находится ДО статики и SPA-fallback.
// >>> ВСТАВЬТЕ сюда блоки из вашей версии (они не изменялись логически) <<<

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
// public (если нужен)
app.use(express.static(path.join(__dirname, 'public')));

// сборка фронтенда (Vite) — доступ к /assets/* и т.д.
app.use(express.static(FRONT_DIST));

/* ============================ SPA FALLBACK ============================ */
/**
 * ВАЖНО: fallback только для НЕ-/api/* путей.
 * Regex ^(?!/api/) — означает “всё, что не начинается с /api/”.
 * Сначала проверяем, что index.html существует — иначе показываем понятную ошибку.
 */
app.get(/^(?!\/api\/).*/, (req, res) => {
  if (!fs.existsSync(INDEX_HTML)) {
    console.error('[SPA Fallback] index.html NOT FOUND at', INDEX_HTML);
    return res.status(404).send(
      `<h1>React app not built</h1>
       <p>Frontend not found. Ensure build step ran:
       <code>npm --prefix frontend run build</code></p>
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
