-- Миграция для блока "Сельское хозяйство"
-- Создание таблиц для хранения данных сельскохозяйственного блока

BEGIN;

-- ========================================
-- 1. Каталог подблоков сельского хозяйства
-- ========================================
CREATE TABLE IF NOT EXISTS public.agriculture_catalog (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agriculture_catalog_code ON public.agriculture_catalog(code);

-- ========================================
-- 2. Элементы (строки в каждом подблоке)
-- ========================================
CREATE TABLE IF NOT EXISTS public.agriculture_items (
  id SERIAL PRIMARY KEY,
  catalog_id INTEGER NOT NULL REFERENCES public.agriculture_catalog(id) ON DELETE CASCADE,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agriculture_items_catalog ON public.agriculture_items(catalog_id);

-- ========================================
-- 3. Данные
-- ========================================
CREATE TABLE IF NOT EXISTS public.agriculture_data (
  id BIGSERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES public.agriculture_items(id) ON DELETE CASCADE,
  municipality_id INTEGER REFERENCES public.municipalities(id) ON DELETE SET NULL,
  period_year INTEGER NOT NULL CHECK (period_year >= 2020 AND period_year <= 2100),
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),

  -- Основные показатели
  value_text TEXT,                    -- Значение (текст)
  value_numeric NUMERIC(15, 2),       -- Значение (число)
  plan_text TEXT,                     -- План (текст)
  plan_numeric NUMERIC(15, 2),        -- План (число)
  percent_complete NUMERIC(5, 2),     -- Процент выполнения

  -- Дополнительные поля
  deadline TEXT,                      -- Срок реализации
  budget TEXT,                        -- Бюджет
  cash_execution TEXT,                -- Кассовое освоение
  construction_readiness NUMERIC(5, 2), -- Строительная готовность
  note TEXT,                          -- Примечание

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_agriculture_data UNIQUE (item_id, municipality_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_agriculture_data_item ON public.agriculture_data(item_id);
CREATE INDEX IF NOT EXISTS idx_agriculture_data_muni ON public.agriculture_data(municipality_id);
CREATE INDEX IF NOT EXISTS idx_agriculture_data_period ON public.agriculture_data(period_year, period_month);

-- ========================================
-- 4. Триггеры для updated_at
-- ========================================
DROP TRIGGER IF EXISTS agriculture_catalog_updated_at ON public.agriculture_catalog;
CREATE TRIGGER agriculture_catalog_updated_at
  BEFORE UPDATE ON public.agriculture_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS agriculture_items_updated_at ON public.agriculture_items;
CREATE TRIGGER agriculture_items_updated_at
  BEFORE UPDATE ON public.agriculture_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS agriculture_data_updated_at ON public.agriculture_data;
CREATE TRIGGER agriculture_data_updated_at
  BEFORE UPDATE ON public.agriculture_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 5. Вставка подблоков
-- ========================================
INSERT INTO public.agriculture_catalog (code, name, sort_order) VALUES
  ('nadzor', 'Надзор', 1),
  ('monitoring', 'Мониторинг', 2),
  ('construction', 'Строительство', 3),
  ('housing_roads', 'Жилищное строительство и дороги', 4),
  ('forestry', 'Лесное хозяйство', 5),
  ('tech_inspection', 'Тех.осмотр комбайнов', 6)
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- Готово!
SELECT '✅ Миграция блока "Сельское хозяйство" завершена' AS status;
