// routes/agriculture.js
'use strict';

const express = require('express');
const router = express.Router();
const { poolRO, pool } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// ========================================
// GET /api/agriculture/catalog
// Получить список всех подблоков
// ========================================
router.get('/catalog', requireAuth, async (req, res) => {
  try {
    const result = await poolRO.query(`
      SELECT id, code, name, description, sort_order
      FROM agriculture_catalog
      ORDER BY sort_order
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[API][agriculture/catalog] Ошибка:', err);
    res.status(500).json({ error: 'Не удалось получить каталог' });
  }
});

// ========================================
// GET /api/agriculture/:catalogCode/items
// Получить элементы конкретного подблока
// ========================================
router.get('/:catalogCode/items', requireAuth, async (req, res) => {
  const { catalogCode } = req.params;

  try {
    const result = await poolRO.query(`
      SELECT
        ai.id,
        ai.name,
        ai.description,
        ai.sort_order,
        ac.code as catalog_code,
        ac.name as catalog_name
      FROM agriculture_items ai
      INNER JOIN agriculture_catalog ac ON ai.catalog_id = ac.id
      WHERE ac.code = $1
      ORDER BY ai.sort_order
    `, [catalogCode]);

    res.json(result.rows);
  } catch (err) {
    console.error(`[API][agriculture/${catalogCode}/items] Ошибка:`, err);
    res.status(500).json({ error: 'Не удалось получить элементы' });
  }
});

// ========================================
// GET /api/agriculture/:catalogCode/data
// Получить данные по подблоку
// Параметры: ?year=2025&month=9
// ========================================
router.get('/:catalogCode/data', requireAuth, async (req, res) => {
  const { catalogCode } = req.params;
  const { year, month } = req.query;

  if (!year) {
    return res.status(400).json({ error: 'Параметр year обязателен' });
  }

  try {
    let query = `
      SELECT
        ad.id,
        ai.id as item_id,
        ai.name as item_name,
        ai.sort_order,
        ad.municipality_id,
        m.name as municipality_name,
        ad.period_year,
        ad.period_month,
        ad.value_text,
        ad.value_numeric,
        ad.plan_text,
        ad.plan_numeric,
        ad.percent_complete,
        ad.deadline,
        ad.budget,
        ad.cash_execution,
        ad.construction_readiness,
        ad.note
      FROM agriculture_data ad
      INNER JOIN agriculture_items ai ON ad.item_id = ai.id
      INNER JOIN agriculture_catalog ac ON ai.catalog_id = ac.id
      LEFT JOIN municipalities m ON ad.municipality_id = m.id
      WHERE ac.code = $1 AND ad.period_year = $2
    `;

    const params = [catalogCode, year];

    if (month) {
      query += ` AND ad.period_month = $3`;
      params.push(month);
    }

    query += ` ORDER BY ai.sort_order, ad.period_month`;

    const result = await poolRO.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(`[API][agriculture/${catalogCode}/data] Ошибка:`, err);
    res.status(500).json({ error: 'Не удалось получить данные' });
  }
});

// ========================================
// POST /api/agriculture/data
// Добавить или обновить данные
// ========================================
router.post('/data', requireAuth, async (req, res) => {
  const {
    item_id,
    municipality_id,
    period_year,
    period_month,
    value_text,
    value_numeric,
    plan_text,
    plan_numeric,
    percent_complete,
    deadline,
    budget,
    cash_execution,
    construction_readiness,
    note
  } = req.body;

  if (!item_id || !period_year || !period_month) {
    return res.status(400).json({
      error: 'Обязательные поля: item_id, period_year, period_month'
    });
  }

  try {
    const result = await pool.query(`
      INSERT INTO agriculture_data (
        item_id, municipality_id, period_year, period_month,
        value_text, value_numeric, plan_text, plan_numeric,
        percent_complete, deadline, budget, cash_execution,
        construction_readiness, note
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (item_id, municipality_id, period_year, period_month)
      DO UPDATE SET
        value_text = EXCLUDED.value_text,
        value_numeric = EXCLUDED.value_numeric,
        plan_text = EXCLUDED.plan_text,
        plan_numeric = EXCLUDED.plan_numeric,
        percent_complete = EXCLUDED.percent_complete,
        deadline = EXCLUDED.deadline,
        budget = EXCLUDED.budget,
        cash_execution = EXCLUDED.cash_execution,
        construction_readiness = EXCLUDED.construction_readiness,
        note = EXCLUDED.note,
        updated_at = NOW()
      RETURNING *
    `, [
      item_id, municipality_id, period_year, period_month,
      value_text, value_numeric, plan_text, plan_numeric,
      percent_complete, deadline, budget, cash_execution,
      construction_readiness, note
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[API][agriculture/data POST] Ошибка:', err);
    res.status(500).json({ error: 'Не удалось сохранить данные' });
  }
});

module.exports = router;
