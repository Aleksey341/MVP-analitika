-- Миграция для блока "Проекты"
-- Создание таблиц для хранения данных портфелей проектов

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
  dynamic_text TEXT,       -- Динамика (текстовое описание)
  dynamic_value NUMERIC(15, 2),  -- Динамика (числовое значение, например процент)
  plan_text TEXT,          -- План (текстовое описание)
  plan_value NUMERIC(15, 2),     -- План (числовое значение)
  fact_text TEXT,          -- Факт (текстовое описание)
  fact_value NUMERIC(15, 2),     -- Факт (числовое значение)

  -- Дополнительные поля для МЭиТ
  task_value NUMERIC(15, 2),           -- Задание
  contract_value NUMERIC(15, 2),       -- Контрактация
  contract_percent NUMERIC(5, 2),      -- Процент контрактации
  fact_percent NUMERIC(5, 2),          -- Процент факта
  objects_plan INTEGER,                -- Объекты по плану
  objects_fact INTEGER,                -- Фактическое выполнение

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Уникальность: один проект в конкретный месяц для МО (или NULL для общих данных)
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

CREATE TRIGGER projects_catalog_updated_at
  BEFORE UPDATE ON public.projects_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER projects_items_updated_at
  BEFORE UPDATE ON public.projects_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER projects_data_updated_at
  BEFORE UPDATE ON public.projects_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 5. Начальные данные - подблоки
-- ========================================
INSERT INTO public.projects_catalog (code, name, sort_order) VALUES
  ('mjkh', 'Портфель проектов МЖКХ', 1),
  ('msia', 'Портфель проектов МСиА', 2),
  ('mtidh', 'Портфель проектов МТиДХ', 3),
  ('meit', 'Портфель проектов МЭиТ', 4),
  ('gosstroinadzor', 'Портфель проектов инспекции Госстройнадзора', 5)
ON CONFLICT (code) DO NOTHING;

-- ========================================
-- 6. Начальные данные - проекты МЖКХ
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
-- 7. Начальные данные - проекты МСиА
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
-- 8. Начальные данные - проекты МТиДХ
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
-- 9. Начальные данные - проекты МЭиТ
-- ========================================
WITH catalog AS (SELECT id FROM public.projects_catalog WHERE code = 'meit')
INSERT INTO public.projects_items (catalog_id, name, sort_order)
SELECT catalog.id, name, sort_order FROM catalog, (VALUES
  ('Модернизация уличного освещения, СНТ', 1),
  ('Модернизация теплоснабжения', 2)
) AS t(name, sort_order)
ON CONFLICT DO NOTHING;

-- ========================================
-- 10. Начальные данные - проекты Госстройнадзора
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

COMMIT;
