// config/database.js
'use strict';
const { Pool } = require('pg');

const bool = v => ['1', 'true', 'yes', 'on'].includes(String(v || '').toLowerCase());

// Parse DATABASE_URL if provided (Amvera support)
let parsedConfig = {};
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    parsedConfig.host = url.hostname;
    parsedConfig.port = parseInt(url.port) || 5432;
    parsedConfig.database = url.pathname.slice(1);
    parsedConfig.user = url.username;
    parsedConfig.password = url.password;
    console.log(`[DB] Using DATABASE_URL: ${url.hostname}:${url.port}/${url.pathname.slice(1)}`);
  } catch (e) {
    console.error('[DB] Failed to parse DATABASE_URL:', e.message);
  }
}

let parsedConfigRO = {};
if (process.env.DATABASE_URL_RO) {
  try {
    const url = new URL(process.env.DATABASE_URL_RO);
    parsedConfigRO.host = url.hostname;
    parsedConfigRO.port = parseInt(url.port) || 5432;
    parsedConfigRO.database = url.pathname.slice(1);
    parsedConfigRO.user = url.username;
    parsedConfigRO.password = url.password;
  } catch (e) {
    console.error('[DB] Failed to parse DATABASE_URL_RO:', e.message);
  }
}

// ---- Эффективные хосты
const RW_HOST = parsedConfig.host || process.env.PGHOST || process.env.DB_HOST || 'amvera-alex1976-cnpg-reports-db-rw';
const RO_HOST = parsedConfigRO.host || process.env.PGHOST_RO || process.env.DB_HOST_RO || RW_HOST;

// ---- Общая база конфигурации
const base = {
  port: Number(parsedConfig.port || process.env.PGPORT || process.env.DB_PORT || 5432),
  database: parsedConfig.database || process.env.PGDATABASE || process.env.DB_NAME || 'reports',
  user: parsedConfig.user || process.env.PGUSER || process.env.DB_USER || 'reports_admin',
  password: parsedConfig.password || process.env.PGPASSWORD || process.env.DB_PASSWORD || 'Qwerty12345!',
  max: Number(process.env.PGPOOL_MAX || 20),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT || 30000),
  connectionTimeoutMillis: Number(process.env.DB_CONN_TIMEOUT || 2000),
  ssl: bool(process.env.PGSSL || (process.env.NODE_ENV === 'production'))
    ? { rejectUnauthorized: bool(process.env.PGSSL_REJECT_UNAUTHORIZED) }
    : undefined,
};

// Разные размеры пулов: RW и RO
const dbConfigRW = { host: RW_HOST, ...base, max: Number(process.env.PGPOOL_MAX || 20) };
const dbConfigRO = { host: RO_HOST, ...base, max: Number(process.env.PGPOOL_MAX_RO || 10) };

console.log(`[DB] RW host=${dbConfigRW.host} | RO host=${dbConfigRO.host} | ssl=${!!base.ssl}`);

// Пулы
const pool   = new Pool(dbConfigRW);
const poolRO = new Pool(dbConfigRO);

// Мониторинг ошибок пулов
pool.on('error',   err => console.error('Неожиданная ошибка БД (RW):', err));
poolRO.on('error', err => console.error('Неожиданная ошибка БД (RO):', err));

// Флаг доступности RO (переключим на false, если первый запрос упадёт)
let roAvailable = true;

// Самотест при старте
async function testConnections() {
  // RW — обязателен
  try {
    const c = await pool.connect();
    console.log('✅ Подключение к БД (RW) установлено');
    c.release();
  } catch (err) {
    console.error('❌ Ошибка подключения к БД (RW):', err.message);
    // RW обязателен — падаем
    process.exit(1);
  }

  // RO — необязателен (может совпадать с RW)
  try {
    const c = await poolRO.connect();
    console.log('✅ Подключение к БД (RO) установлено');
    c.release();
    roAvailable = true;
  } catch (err) {
    if (dbConfigRO.host !== dbConfigRW.host) {
      console.warn('⚠️  ReadOnly хост недоступен, аналитика будет читать из RW:', err.message);
    }
    roAvailable = false;
  }
}

// запуск самотеста (не блокирует импорт модуля)
testConnections().catch(e => console.error('Test connect error:', e));

// Универсальный запрос
async function query(text, params, useReadOnly = false) {
  const start = Date.now();
  let target = (useReadOnly && roAvailable) ? poolRO : pool;

  try {
    const res = await target.query(text, params);
    const ms = Date.now() - start;
    console.log(`🔍 Executed query (${target === poolRO ? 'RO' : 'RW'}): ${ms}ms, rows=${res.rowCount}`);
    return res;
  } catch (err) {
    // Если упал первый RO-запрос — пометим RO как недоступный и попробуем один раз на RW
    if (useReadOnly && roAvailable) {
      console.warn('⚠️  RO запрос упал, переключаемся на RW. Причина:', err.message);
      roAvailable = false;
      const res = await pool.query(text, params);
      const ms = Date.now() - start;
      console.log(`🔁 Fallback to RW: ${ms}ms, rows=${res.rowCount}`);
      return res;
    }

    console.error('🚨 Database query error:', {
      error: err.message,
      query: text,
      params
    });
    throw err;
  }
}

// Транзакции (всегда через RW)
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  poolRO,
  query,
  transaction,
};
