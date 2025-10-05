# Инструкция по миграции данных из Формы 1-ГМУ в дашборд услуг

## Проблема

Вы импортировали данные через **"Форма 1-ГМУ"**, но они сохранились в таблицу `indicator_values`, а дашборд услуг читает из таблицы `service_values`.

## Решение

Перенести данные из `indicator_values` → `service_values` с помощью SQL скрипта.

---

## 📋 Пошаговая инструкция

### Шаг 1: Подготовка

Убедитесь, что выполнены скрипты:
1. ✅ `01_create_services_tables.sql` - таблицы созданы
2. ✅ `02_seed_services_catalog.sql` - справочник услуг заполнен

### Шаг 2: Анализ данных

Откройте pgAdmin и выполните **запросы для анализа**:

```sql
-- Посмотреть, какие показатели есть в indicator_values
SELECT
  ic.id,
  ic.name,
  ic.category,
  COUNT(iv.id) as records_count
FROM indicators_catalog ic
LEFT JOIN indicator_values iv ON iv.indicator_id = ic.id
GROUP BY ic.id, ic.name, ic.category
HAVING COUNT(iv.id) > 0
ORDER BY records_count DESC;
```

Вы увидите список показателей, которые были импортированы через Форму 1-ГМУ.

### Шаг 3: Выберите стратегию миграции

Скрипт `03_migrate_indicators_to_services.sql` содержит **4 варианта**:

#### 🔹 Вариант 1: Автоматическая миграция (по совпадению названий)

**Когда использовать:** Если названия показателей в `indicators_catalog` совпадают с названиями услуг в `services_catalog`.

**Пример:**
- Показатель: "Запись к врачу" → Услуга: "Запись к врачу" ✅

**Как выполнить:**
1. Откройте `03_migrate_indicators_to_services.sql`
2. Найдите раздел "ВАРИАНТ 1"
3. Выполните этот блок кода

#### 🔹 Вариант 2: Миграция конкретных показателей (вручную)

**Когда использовать:** Если хотите точно контролировать, какие показатели переносить.

**Пример:**
```sql
-- Перенос показателя "Количество выданных паспортов" -> услуга "Оформление паспорта"
INSERT INTO service_values (municipality_id, service_id, period_year, period_month, value_numeric)
SELECT
  iv.municipality_id,
  (SELECT id FROM services_catalog WHERE name = 'Оформление паспорта' LIMIT 1) as service_id,
  iv.period_year,
  iv.period_month,
  iv.value_numeric
FROM indicator_values iv
INNER JOIN indicators_catalog ic ON ic.id = iv.indicator_id
WHERE ic.name LIKE '%паспорт%'
  AND iv.value_numeric IS NOT NULL
ON CONFLICT (municipality_id, service_id, period_year, period_month)
DO UPDATE SET value_numeric = EXCLUDED.value_numeric;
```

**Как выполнить:**
1. Откройте `03_migrate_indicators_to_services.sql`
2. Найдите раздел "ВАРИАНТ 2"
3. Раскомментируйте и настройте под свои показатели
4. Выполните

#### 🔹 Вариант 3: Просмотр данных (без миграции)

**Когда использовать:** Чтобы понять, какие данные есть, перед миграцией.

**Запросы:**
```sql
-- Посмотреть показатели, которые похожи на услуги
SELECT DISTINCT
  ic.id,
  ic.name,
  ic.category,
  COUNT(iv.id) as records_count
FROM indicators_catalog ic
LEFT JOIN indicator_values iv ON iv.indicator_id = ic.id
WHERE ic.name ILIKE ANY(ARRAY[
  '%услуг%',
  '%обращен%',
  '%запис%',
  '%выдан%',
  '%оформлен%'
])
GROUP BY ic.id, ic.name, ic.category
ORDER BY records_count DESC;
```

#### 🔹 Вариант 4: Маппинг (для разных названий)

**Когда использовать:** Если показатели и услуги имеют разные названия.

**Пример:**
- Показатель: "Выдано паспортов" ≠ Услуга: "Оформление паспорта"

**Как выполнить:**
1. Откройте `03_migrate_indicators_to_services.sql`
2. Найдите раздел "ВАРИАНТ 4"
3. Создайте таблицу маппинга:
```sql
CREATE TEMP TABLE indicator_to_service_mapping (
  indicator_name VARCHAR(255),
  service_name VARCHAR(255)
);

INSERT INTO indicator_to_service_mapping (indicator_name, service_name) VALUES
  ('Выдано паспортов', 'Оформление паспорта'),
  ('Записей к врачу через портал', 'Запись к врачу'),
  -- Добавьте ваши соответствия
```
4. Выполните миграцию по маппингу

---

## ✅ Проверка результатов

После миграции выполните:

```sql
-- Сколько записей перенесено
SELECT COUNT(*) as migrated_records FROM service_values;

-- Детализация по услугам
SELECT
  sc.name as service_name,
  sc.category,
  COUNT(sv.id) as records_count,
  SUM(sv.value_numeric) as total_value
FROM services_catalog sc
LEFT JOIN service_values sv ON sv.service_id = sc.id
GROUP BY sc.name, sc.category
HAVING COUNT(sv.id) > 0
ORDER BY records_count DESC;
```

**Ожидаемый результат:**
- Вы увидите список услуг и количество перенесённых записей

---

## 🎯 Проверка на дашборде

1. Войдите как **Администратор**
2. Откройте **"Общий дашборд"**
3. Вкладка **"Услуги"**
4. Выберите год и месяц

Вы должны увидеть:
- ✅ KPI с данными
- ✅ Графики с данными

---

## ⚠️ Важные замечания

1. **Безопасность данных:**
   - Скрипт использует `ON CONFLICT DO UPDATE` - существующие данные будут перезаписаны
   - Сделайте резервную копию БД перед миграцией!

2. **Дублирование данных:**
   - Данные останутся в `indicator_values` (для Формы 1-ГМУ)
   - И будут скопированы в `service_values` (для дашборда услуг)
   - Это нормально - таблицы служат разным целям

3. **Повторная миграция:**
   - Можно выполнять скрипт многократно
   - Благодаря `ON CONFLICT` дубликаты не создадутся

---

## 🆘 Если ничего не работает

### Сценарий 1: Показатели не являются услугами

Если в `indicator_values` у вас экономические показатели (ВРП, инвестиции, долг), а не услуги гражданам - **миграция не нужна**.

**Решение:** Заполните данные по услугам через новую форму **"Импорт услуг"** (`/services-import`).

### Сценарий 2: Нужны тестовые данные

Создайте тестовые данные вручную:

```sql
-- Вставить тестовые данные для муниципалитета ID=1, август 2025
INSERT INTO service_values (municipality_id, service_id, period_year, period_month, value_numeric)
SELECT
  1 as municipality_id,
  id as service_id,
  2025 as period_year,
  8 as period_month,
  (RANDOM() * 1000)::INTEGER as value_numeric
FROM services_catalog
ON CONFLICT DO NOTHING;
```

Проверьте дашборд - должны появиться данные.

---

## 📊 Резюме

| Задача | Инструмент |
|--------|-----------|
| Создать таблицы | `01_create_services_tables.sql` |
| Заполнить справочник услуг | `02_seed_services_catalog.sql` |
| Перенести данные из Формы 1-ГМУ | `03_migrate_indicators_to_services.sql` |
| Ввести новые данные по услугам | Форма `/services-import` |
| Посмотреть аналитику | Дашборд → вкладка "Услуги" |

---

## Контакты

Если возникли вопросы - проверьте:
1. Логи сервера в консоли
2. Developer Tools (F12) → Console
3. Структуру таблиц в pgAdmin
