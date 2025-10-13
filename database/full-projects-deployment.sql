-- ========================================
-- Полное развертывание блока "Проекты"
-- Выполните этот скрипт в PgAdmin
-- ========================================

-- Включаем транзакцию для безопасности
BEGIN;

-- ========================================
-- 1. Каталог подблоков проектов
-- ========================================
CREATE TABLE IF NOT EXISTS public.projects_catalog (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_catalog_code ON public.projects_catalog(code);

-- ========================================
-- 2. Элементы проектов (строки в каждом подблоке)
-- ========================================
CREATE TABLE IF NOT EXISTS public.projects_items (
  id SERIAL PRIMARY KEY,
  catalog_id INTEGER NOT NULL REFERENCES public.projects_catalog(id) ON DELETE CASCADE,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_items_catalog ON public.projects_items(catalog_id);

-- ========================================
-- 3. Данные по проектам
-- ========================================
CREATE TABLE IF NOT EXISTS public.projects_data (
  id BIGSERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES public.projects_items(id) ON DELETE CASCADE,
  municipality_id INTEGER REFERENCES public.municipalities(id) ON DELETE SET NULL,
  period_year INTEGER NOT NULL CHECK (period_year >= 2020 AND period_year <= 2100),
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),

  -- Основные показатели
  dynamic_text TEXT,
  dynamic_value NUMERIC(15, 2),
  plan_text TEXT,
  plan_value NUMERIC(15, 2),
  fact_text TEXT,
  fact_value NUMERIC(15, 2),

  -- Дополнительные поля для МЭиТ
  task_value NUMERIC(15, 2),
  contract_value NUMERIC(15, 2),
  contract_percent NUMERIC(5, 2),
  fact_percent NUMERIC(5, 2),
  objects_plan INTEGER,
  objects_fact INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_projects_data UNIQUE (item_id, municipality_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_projects_data_item ON public.projects_data(item_id);
CREATE INDEX IF NOT EXISTS idx_projects_data_muni ON public.projects_data(municipality_id);
CREATE INDEX IF NOT EXISTS idx_projects_data_period ON public.projects_data(period_year, period_month);

-- ========================================
-- 4. Триггеры для updated_at
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_catalog_updated_at ON public.projects_catalog;
CREATE TRIGGER projects_catalog_updated_at
  BEFORE UPDATE ON public.projects_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS projects_items_updated_at ON public.projects_items;
CREATE TRIGGER projects_items_updated_at
  BEFORE UPDATE ON public.projects_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS projects_data_updated_at ON public.projects_data;
CREATE TRIGGER projects_data_updated_at
  BEFORE UPDATE ON public.projects_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 5. Вставка подблоков проектов
-- ========================================
INSERT INTO public.projects_catalog (code, name, sort_order) VALUES
  ('mjkh', 'Портфель проектов МЖКХ', 1),
  ('msia', 'Портфель проектов МСиА', 2),
  ('mtidh', 'Портфель проектов МТиДХ', 3),
  ('meit', 'Портфель проектов МЭиТ', 4),
  ('gosstroinadzor', 'Портфель проектов инспекции Госстройнадзора', 5)
ON CONFLICT (code) DO NOTHING;

-- ========================================
-- 6. Вставка проектов МЖКХ
-- ========================================
WITH catalog AS (SELECT id FROM public.projects_catalog WHERE code = 'mjkh')
INSERT INTO public.projects_items (catalog_id, name, sort_order)
SELECT catalog.id, name, sort_order FROM catalog, (VALUES
  ('Переселение из АЖФ', 1),
  ('Сертификаты (дети-сироты)', 2),
  ('Закупка квартир для детей-сирот', 3),
  ('ФП «ФКГС» ФБ', 4),
  ('ФП «ФКГС» ОБ', 5),
  ('Конкурс МГ и ИП ФБ', 6),
  ('ФП «МКИ»', 7),
  ('ФНБ', 8),
  ('Строительство объектов ВС и ВО', 9),
  ('СКК', 10),
  ('Госдолг', 11)
) AS t(name, sort_order)
ON CONFLICT DO NOTHING;

-- ========================================
-- 7. Вставка проектов МСиА
-- ========================================
WITH catalog AS (SELECT id FROM public.projects_catalog WHERE code = 'msia')
INSERT INTO public.projects_items (catalog_id, name, sort_order)
SELECT catalog.id, name, sort_order FROM catalog, (VALUES
  ('Ввод жилья', 1),
  ('Разработка градостроительной документации', 2),
  ('Касса по объектам ОКУ УКС', 3),
  ('Касса лимитов ОБ 2025 на капремонт', 4)
) AS t(name, sort_order)
ON CONFLICT DO NOTHING;

-- ========================================
-- 8. Вставка проектов МТиДХ
-- ========================================
WITH catalog AS (SELECT id FROM public.projects_catalog WHERE code = 'mtidh')
INSERT INTO public.projects_items (catalog_id, name, sort_order)
SELECT catalog.id, name, sort_order FROM catalog, (VALUES
  ('Модернизация ГЭТ', 1),
  ('ИДЖ', 2),
  ('КРСТ', 3),
  ('Субсидии МО', 4),
  ('ИТС', 5)
) AS t(name, sort_order)
ON CONFLICT DO NOTHING;

-- ========================================
-- 9. Вставка проектов МЭиТ
-- ========================================
WITH catalog AS (SELECT id FROM public.projects_catalog WHERE code = 'meit')
INSERT INTO public.projects_items (catalog_id, name, sort_order)
SELECT catalog.id, name, sort_order FROM catalog, (VALUES
  ('Модернизация уличного освещения, СНТ', 1),
  ('Модернизация теплоснабжения', 2)
) AS t(name, sort_order)
ON CONFLICT DO NOTHING;

-- ========================================
-- 10. Вставка проектов Госстройнадзора
-- ========================================
WITH catalog AS (SELECT id FROM public.projects_catalog WHERE code = 'gosstroinadzor')
INSERT INTO public.projects_items (catalog_id, name, sort_order)
SELECT catalog.id, name, sort_order FROM catalog, (VALUES
  ('Количество поднадзорных объектов', 1),
  ('Количество завершённых проверок', 2),
  ('Количество предписаний', 3),
  ('Количество заключений/отказов', 4),
  ('Количество протоколов', 5),
  ('Привлечено к административной ответственности', 6),
  ('Сумма наложенных и взысканных штрафов (тыс. руб.)', 7),
  ('Количество обращений', 8)
) AS t(name, sort_order)
ON CONFLICT DO NOTHING;

-- ========================================
-- 11. ДАННЫЕ за СЕНТЯБРЬ 2025 - МЖКХ
-- ========================================
DO $$
DECLARE
  v_catalog_id INTEGER;
BEGIN
  SELECT id INTO v_catalog_id FROM public.projects_catalog WHERE code = 'mjkh';

  -- Переселение из АЖФ
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value, plan_text)
  SELECT pi.id, NULL, 2025, 9, '0,8 тыс. кв. м', 0.8, '2025 - 0,48 тыс.кв.м.
2026 - 2,0 тыс.кв.м.'
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Переселение из АЖФ'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- Сертификаты (дети-сироты)
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value, plan_text)
  SELECT pi.id, NULL, 2025, 9, '. Заявлений: 35 шт.
. Выдано: 33 шт.
. Оплачено: 19 сертификатов на сумму 67,61 млн руб. (57,46%)', 57.46, '32 шт. на сумму 117,7 млн руб.'
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Сертификаты (дети-сироты)'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- Закупка квартир для детей-сирот
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value, plan_text)
  SELECT pi.id, NULL, 2025, 9, '. Факт: 312 шт. (90%)
. На стадии заключения: 11 шт.
. Касса: 559,8 млн руб. (45%)', 90, '348 кв. на сумму 1 255,2 млн руб.'
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Закупка квартир для детей-сирот'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- ФП «ФКГС» ФБ
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value, plan_text)
  SELECT pi.id, NULL, 2025, 9, 'Касса: 183,4 млн руб. (62%)', 62, '297,12 млн. руб.
65 ед.'
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'ФП «ФКГС» ФБ'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- ФП «ФКГС» ОБ
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value, plan_text)
  SELECT pi.id, NULL, 2025, 9, '. Касса: 351 млн руб. (89%)
. 211,5 млн руб. (54%)', 89, '394,2 млн. руб'
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'ФП «ФКГС» ОБ'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- Конкурс МГ и ИП ФБ
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value, plan_text)
  SELECT pi.id, NULL, 2025, 9, 'Касса: 107 млн руб. (52%)', 52, '3  ед. /206,3 млн. руб.'
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Конкурс МГ и ИП ФБ'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- ФП «МКИ»
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value, plan_text)
  SELECT pi.id, NULL, 2025, 9, '. Контрактование: 9 ед. (100%) / 305,1 млн руб. (79,5%)
. Экономия: 78,5 млн руб.
. Касса: 119,7 млн руб. (31%)', 100, '9 ед. / 383,6 млн. руб'
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'ФП «МКИ»'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- ФНБ
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value, plan_text)
  SELECT pi.id, NULL, 2025, 9, '. Касса: 177,4 млн руб. (14,4%)
. Готовность: 20,11% (+0,1%)', 20.11, '1 ед. / 1231,1 млн. руб'
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'ФНБ'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- Строительство объектов ВС и ВО
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value, plan_text)
  SELECT pi.id, NULL, 2025, 9, '. Контрактование: 113 ед. (86,9%) / 518,3 млн руб. (94,3%)
. Касса: 124,5 млн руб. (22,7%)', 86.9, '130 ед. / 549,5 млн. руб'
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Строительство объектов ВС и ВО'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- СКК
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value, plan_text)
  SELECT pi.id, NULL, 2025, 9, 'Касса: 158,5 млн руб. (76,1%)
Готовность: 75% (+11%)', 75, '2 ед. / 208,3 млн. руб.'
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'СКК'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- Госдолг
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value, plan_text)
  SELECT pi.id, NULL, 2025, 9, '. Контрактование: 12 ед. (75%) / 499,5 млн руб. (58,5%)
. Касса: 92,6 млн руб. (10,8%)', 75, '16 ед . / 853,2 млн. руб.'
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Госдолг'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;
END $$;

-- ========================================
-- 12. ДАННЫЕ за СЕНТЯБРЬ 2025 - МСиА
-- ========================================
DO $$
DECLARE
  v_catalog_id INTEGER;
BEGIN
  SELECT id INTO v_catalog_id FROM public.projects_catalog WHERE code = 'msia';

  -- Ввод жилья
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value, plan_text)
  SELECT pi.id, NULL, 2025, 9, '37,9% (+5,9%)', 37.9, '880,0 тыс. М²'
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Ввод жилья'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- Разработка градостроительной документации
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_value, plan_text)
  SELECT pi.id, NULL, 2025, 9, 41, '4 160 млн.'
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Разработка градостроительной документации'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- Касса по объектам ОКУ УКС
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value, plan_text)
  SELECT pi.id, NULL, 2025, 9, '40%', 40, '72 млн.'
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Касса по объектам ОКУ УКС'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- Касса лимитов ОБ 2025 на капремонт
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value, plan_text)
  SELECT pi.id, NULL, 2025, 9, '62% (+17%)', 62, '190 млн.'
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Касса лимитов ОБ 2025 на капремонт'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;
END $$;

-- ========================================
-- 13. ДАННЫЕ за СЕНТЯБРЬ 2025 - МТиДХ
-- ========================================
DO $$
DECLARE
  v_catalog_id INTEGER;
BEGIN
  SELECT id INTO v_catalog_id FROM public.projects_catalog WHERE code = 'mtidh';

  -- Модернизация ГЭТ
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_value)
  SELECT pi.id, NULL, 2025, 9, 75
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Модернизация ГЭТ'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- ИДЖ
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value)
  SELECT pi.id, NULL, 2025, 9, '58,6% (+1,6%)', 58.6
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'ИДЖ'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- КРСТ
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_value)
  SELECT pi.id, NULL, 2025, 9, 78
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'КРСТ'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- Субсидии МО
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value)
  SELECT pi.id, NULL, 2025, 9, ' 52% (+3%)', 52
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Субсидии МО'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- ИТС
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_value)
  SELECT pi.id, NULL, 2025, 9, 100
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'ИТС'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;
END $$;

-- ========================================
-- 14. ДАННЫЕ за СЕНТЯБРЬ 2025 - МЭиТ
-- ========================================
DO $$
DECLARE
  v_catalog_id INTEGER;
BEGIN
  SELECT id INTO v_catalog_id FROM public.projects_catalog WHERE code = 'meit';

  -- Модернизация уличного освещения, СНТ
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month,
    task_value, contract_value, contract_percent, fact_value, fact_percent, objects_plan, objects_fact)
  SELECT pi.id, NULL, 2025, 9, 16.93, 8.82, 52.1, 7.63, 45.1, 25, 14
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Модернизация уличного освещения, СНТ'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- Модернизация теплоснабжения
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month,
    task_value, contract_value, contract_percent, fact_value, fact_percent, objects_plan, objects_fact)
  SELECT pi.id, NULL, 2025, 9, 187.34, 156.89, 83.8, 27.67, 14.8, 24, 6
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Модернизация теплоснабжения'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;
END $$;

-- ========================================
-- 15. ДАННЫЕ за СЕНТЯБРЬ 2025 - Госстройнадзор
-- ========================================
DO $$
DECLARE
  v_catalog_id INTEGER;
BEGIN
  SELECT id INTO v_catalog_id FROM public.projects_catalog WHERE code = 'gosstroinadzor';

  -- Количество поднадзорных объектов
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value)
  SELECT pi.id, NULL, 2025, 9, '243 (+0)', 243
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Количество поднадзорных объектов'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- Количество завершённых проверок
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value)
  SELECT pi.id, NULL, 2025, 9, '320 (+8)', 320
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Количество завершённых проверок'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- Количество предписаний
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value)
  SELECT pi.id, NULL, 2025, 9, '52 (+0)', 52
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Количество предписаний'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- Количество заключений/отказов
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text)
  SELECT pi.id, NULL, 2025, 9, '47 (+0)/16 (+1)'
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Количество заключений/отказов'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- Количество протоколов
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value)
  SELECT pi.id, NULL, 2025, 9, '80 (+0)', 80
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Количество протоколов'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- Привлечено к административной ответственности
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text)
  SELECT pi.id, NULL, 2025, 9, '31 (+3 ю.л.)/27 (+1 ю.л.)'
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Привлечено к административной ответственности'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- Сумма наложенных и взысканных штрафов (тыс. руб.)
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value)
  SELECT pi.id, NULL, 2025, 9, '6520 (+150)/3630 (+75) - 56%', 56
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Сумма наложенных и взысканных штрафов (тыс. руб.)'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;

  -- Количество обращений
  INSERT INTO public.projects_data (item_id, municipality_id, period_year, period_month, dynamic_text, dynamic_value)
  SELECT pi.id, NULL, 2025, 9, '107 (+6)/105 (+5) - 98%', 98
  FROM public.projects_items pi WHERE pi.catalog_id = v_catalog_id AND pi.name = 'Количество обращений'
  ON CONFLICT (item_id, municipality_id, period_year, period_month) DO NOTHING;
END $$;

-- ========================================
-- 16. Проверка результатов
-- ========================================
SELECT 'Подблоков проектов:' AS info, COUNT(*) AS count FROM public.projects_catalog
UNION ALL
SELECT 'Проектов всего:', COUNT(*) FROM public.projects_items
UNION ALL
SELECT 'Записей данных:', COUNT(*) FROM public.projects_data;

-- Вывод списка подблоков
SELECT code, name, sort_order FROM public.projects_catalog ORDER BY sort_order;

-- Подсчет проектов в каждом подблоке
SELECT
  pc.name AS "Подблок",
  COUNT(pi.id) AS "Количество проектов"
FROM public.projects_catalog pc
LEFT JOIN public.projects_items pi ON pc.id = pi.catalog_id
GROUP BY pc.name, pc.sort_order
ORDER BY pc.sort_order;

COMMIT;

-- ========================================
-- ГОТОВО!
-- ========================================
SELECT '✅ Развертывание завершено успешно!' AS status;
