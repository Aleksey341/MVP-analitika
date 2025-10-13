// routes/projects.js
'use strict';

const express = require('express');
const router = express.Router();
const { poolRO, pool } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

// ========================================
// GET /api/projects/catalog
// Получить список всех подблоков проектов
// ========================================
router.get('/catalog', requireAuth, async (req, res) => {
  try {
    const result = await poolRO.query(`
      SELECT id, code, name, description, sort_order
      FROM projects_catalog
      ORDER BY sort_order
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[API][projects/catalog] Ошибка:', err);
    res.status(500).json({ error: 'Не удалось получить каталог проектов' });
  }
});

// ========================================
// GET /api/projects/:catalogCode/items
// Получить проекты конкретного подблока
// ========================================
router.get('/:catalogCode/items', requireAuth, async (req, res) => {
  const { catalogCode } = req.params;

  try {
    const result = await poolRO.query(`
      SELECT
        pi.id,
        pi.name,
        pi.description,
        pi.sort_order,
        pc.code as catalog_code,
        pc.name as catalog_name
      FROM projects_items pi
      INNER JOIN projects_catalog pc ON pi.catalog_id = pc.id
      WHERE pc.code = $1
      ORDER BY pi.sort_order
    `, [catalogCode]);

    res.json(result.rows);
  } catch (err) {
    console.error(`[API][projects/${catalogCode}/items] Ошибка:`, err);
    res.status(500).json({ error: 'Не удалось получить проекты' });
  }
});

// ========================================
// GET /api/projects/:catalogCode/data
// Получить данные по проектам подблока
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
        pd.id,
        pi.id as item_id,
        pi.name as item_name,
        pi.sort_order,
        pd.municipality_id,
        m.name as municipality_name,
        pd.period_year,
        pd.period_month,
        pd.dynamic_text,
        pd.dynamic_value,
        pd.plan_text,
        pd.plan_value,
        pd.fact_text,
        pd.fact_value,
        pd.task_value,
        pd.contract_value,
        pd.contract_percent,
        pd.fact_percent,
        pd.objects_plan,
        pd.objects_fact
      FROM projects_data pd
      INNER JOIN projects_items pi ON pd.item_id = pi.id
      INNER JOIN projects_catalog pc ON pi.catalog_id = pc.id
      LEFT JOIN municipalities m ON pd.municipality_id = m.id
      WHERE pc.code = $1 AND pd.period_year = $2
    `;

    const params = [catalogCode, year];

    if (month) {
      query += ` AND pd.period_month = $3`;
      params.push(month);
    }

    query += ` ORDER BY pi.sort_order, pd.period_month`;

    const result = await poolRO.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(`[API][projects/${catalogCode}/data] Ошибка:`, err);
    res.status(500).json({ error: 'Не удалось получить данные проектов' });
  }
});

// ========================================
// GET /api/projects/item/:itemId/history
// Получить историю данных по конкретному проекту
// Параметры: ?year=2025
// ========================================
router.get('/item/:itemId/history', requireAuth, async (req, res) => {
  const { itemId } = req.params;
  const { year } = req.query;

  if (!year) {
    return res.status(400).json({ error: 'Параметр year обязателен' });
  }

  try {
    const result = await poolRO.query(`
      SELECT
        pd.period_month,
        pd.dynamic_value,
        pd.plan_value,
        pd.fact_value,
        pd.dynamic_text,
        pd.plan_text,
        pd.fact_text
      FROM projects_data pd
      WHERE pd.item_id = $1 AND pd.period_year = $2
      ORDER BY pd.period_month
    `, [itemId, year]);

    res.json(result.rows);
  } catch (err) {
    console.error(`[API][projects/item/${itemId}/history] Ошибка:`, err);
    res.status(500).json({ error: 'Не удалось получить историю проекта' });
  }
});

// ========================================
// POST /api/projects/data
// Добавить или обновить данные проекта
// ========================================
router.post('/data', requireAuth, async (req, res) => {
  const {
    item_id,
    municipality_id,
    period_year,
    period_month,
    dynamic_text,
    dynamic_value,
    plan_text,
    plan_value,
    fact_text,
    fact_value,
    task_value,
    contract_value,
    contract_percent,
    fact_percent,
    objects_plan,
    objects_fact
  } = req.body;

  if (!item_id || !period_year || !period_month) {
    return res.status(400).json({
      error: 'Обязательные поля: item_id, period_year, period_month'
    });
  }

  try {
    const result = await pool.query(`
      INSERT INTO projects_data (
        item_id, municipality_id, period_year, period_month,
        dynamic_text, dynamic_value, plan_text, plan_value,
        fact_text, fact_value, task_value, contract_value,
        contract_percent, fact_percent, objects_plan, objects_fact
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (item_id, municipality_id, period_year, period_month)
      DO UPDATE SET
        dynamic_text = EXCLUDED.dynamic_text,
        dynamic_value = EXCLUDED.dynamic_value,
        plan_text = EXCLUDED.plan_text,
        plan_value = EXCLUDED.plan_value,
        fact_text = EXCLUDED.fact_text,
        fact_value = EXCLUDED.fact_value,
        task_value = EXCLUDED.task_value,
        contract_value = EXCLUDED.contract_value,
        contract_percent = EXCLUDED.contract_percent,
        fact_percent = EXCLUDED.fact_percent,
        objects_plan = EXCLUDED.objects_plan,
        objects_fact = EXCLUDED.objects_fact,
        updated_at = NOW()
      RETURNING *
    `, [
      item_id, municipality_id, period_year, period_month,
      dynamic_text, dynamic_value, plan_text, plan_value,
      fact_text, fact_value, task_value, contract_value,
      contract_percent, fact_percent, objects_plan, objects_fact
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[API][projects/data POST] Ошибка:', err);
    res.status(500).json({ error: 'Не удалось сохранить данные проекта' });
  }
});

module.exports = router;
