# Инструкция по импорту данных услуг

## Проблема, которую мы решили

**Форма 1-ГМУ** (`/form.html`) сохраняет данные в таблицу `indicator_values` - это показатели эффективности муниципалитетов (экономика, финансы и т.д.).

**Дашборд услуг** (`/dashboard` → вкладка "Услуги") читает данные из таблицы `service_values` - это количество оказанных услуг гражданам.

**Это разные таблицы для разных целей!**

## Решение

Создана новая форма **"Импорт услуг"** для внесения данных по оказанным услугам.

## Шаги для начала работы

### 1. Создайте таблицы и заполните справочник услуг в БД

Откройте pgAdmin и выполните **ПО ПОРЯДКУ** два скрипта:

**Шаг 1:** Создание таблиц
```sql
-- Выполните: sql/01_create_services_tables.sql
```
Этот скрипт создаст таблицы `services_catalog` и `service_values` с индексами и внешними ключами.

**Шаг 2:** Заполнение справочника
```sql
-- Выполните: sql/02_seed_services_catalog.sql
```
Этот скрипт добавит 35 типовых услуг в 7 категориях:
- Социальная защита (5 услуг)
- Здравоохранение (5 услуг)
- Образование (5 услуг)
- ЖКХ и благоустройство (5 услуг)
- Транспорт (5 услуг)
- Документы и регистрация (5 услуг)
- Бизнес (5 услуг)

**Проверка:**
```sql
SELECT COUNT(*) FROM services_catalog;
-- Должно быть 35 услуг
```

### 2. Войдите в систему как муниципалитет

1. Откройте главную страницу: `http://localhost/`
2. Выберите любой муниципалитет (не администратор!)
3. Введите пароль

### 3. Откройте форму "Импорт услуг"

На главной странице появилась новая карточка:
- **Импорт услуг** - Внесение данных по оказанным услугам

Нажмите "Открыть →"

### 4. Внесите данные

1. Выберите **год** (например, 2025)
2. Выберите **месяц** (например, Август)
3. Заполните количество оказанных услуг в таблице
4. Нажмите **"💾 Сохранить данные"**

Данные сохранятся в таблицу `service_values`.

### 5. Проверьте дашборд

1. Войдите как **Администратор**
2. Откройте **"Общий дашборд"**
3. Перейдите на вкладку **"Услуги"**
4. Выберите тот же год и месяц

Вы увидите:
- ✅ KPI: Всего услуг оказано
- ✅ График: Динамика по месяцам
- ✅ График: ТОП-10 популярных услуг
- ✅ График: Распределение по категориям
- ✅ График: Сравнение муниципалитетов

## Структура таблиц

### services_catalog (справочник)
```sql
CREATE TABLE services_catalog (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  category VARCHAR(100),
  description TEXT
);
```

### service_values (данные)
```sql
CREATE TABLE service_values (
  id SERIAL PRIMARY KEY,
  municipality_id INTEGER REFERENCES municipalities(id),
  service_id INTEGER REFERENCES services_catalog(id),
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  value_numeric NUMERIC(15,2),
  UNIQUE(municipality_id, service_id, period_year, period_month)
);
```

## API Endpoints

### GET /api/services-catalog
Получить список всех услуг из справочника.

**Авторизация:** Требуется

**Ответ:**
```json
[
  {
    "id": 1,
    "name": "Назначение пенсий",
    "category": "Социальная защита",
    "description": "Оформление пенсий по возрасту, инвалидности"
  },
  ...
]
```

### GET /api/service-values
Получить значения услуг за период.

**Авторизация:** Требуется

**Параметры:**
- `year` - год (обязательно)
- `month` - месяц 1-12 (обязательно)
- `municipality_id` - ID муниципалитета (обязательно)

**Ответ:**
```json
[
  {
    "service_id": 1,
    "value_numeric": 150
  },
  ...
]
```

### POST /api/service-values/save
Сохранить значения услуг.

**Авторизация:** Требуется + доступ к муниципалитету

**Тело запроса:**
```json
{
  "municipality_id": 1,
  "period_year": 2025,
  "period_month": 8,
  "values": [
    {
      "service_id": 1,
      "value_numeric": 150
    },
    {
      "service_id": 2,
      "value_numeric": 200
    }
  ]
}
```

**Ответ:**
```json
{
  "saved": 2,
  "message": "Данные успешно сохранены"
}
```

### GET /api/services-dashboard/data
Агрегированная аналитика по услугам (для дашборда).

**Авторизация:** Требуется

**Параметры:**
- `year` - год (обязательно)
- `month` - месяц 1-12 (опционально, для фильтрации)
- `municipality_id` - ID муниципалитета (опционально, для фильтрации)

**Ответ:**
```json
{
  "kpi": {
    "total_services": 5000,
    "prev_total_services": 4500,
    "change_percent": "11.1"
  },
  "monthly_dynamics": [
    {"month": 1, "total": 400},
    {"month": 2, "total": 450},
    ...
  ],
  "top_services": [
    {
      "id": 1,
      "name": "Запись к врачу",
      "category": "Здравоохранение",
      "total": 800
    },
    ...
  ],
  "categories": [
    {
      "category": "Здравоохранение",
      "total": 1500
    },
    ...
  ],
  "top_municipalities": [
    {
      "id": 1,
      "name": "Липецк",
      "total": 2000
    },
    ...
  ]
}
```

## Проверка данных в БД

```sql
-- Проверить справочник услуг
SELECT * FROM services_catalog ORDER BY category, name;

-- Проверить введенные данные
SELECT
  m.name as municipality,
  sc.name as service,
  sc.category,
  sv.period_year,
  sv.period_month,
  sv.value_numeric
FROM service_values sv
JOIN municipalities m ON m.id = sv.municipality_id
JOIN services_catalog sc ON sc.id = sv.service_id
ORDER BY sv.period_year DESC, sv.period_month DESC, m.name;

-- Агрегированная статистика
SELECT
  sc.category,
  SUM(sv.value_numeric) as total_services
FROM service_values sv
JOIN services_catalog sc ON sc.id = sv.service_id
WHERE sv.period_year = 2025
GROUP BY sc.category
ORDER BY total_services DESC;
```

## Отличия от Формы 1-ГМУ

| Параметр | Форма 1-ГМУ | Импорт услуг |
|----------|-------------|--------------|
| Таблица данных | `indicator_values` | `service_values` |
| Справочник | `indicators_catalog` | `services_catalog` |
| Назначение | Показатели эффективности муниципалитета | Количество оказанных услуг гражданам |
| Примеры | ВРП, Инвестиции, Долг | Запись к врачу, Оформление паспорта |
| URL формы | `/form` | `/services-import` |
| API сохранения | `/api/reports/save` | `/api/service-values/save` |
| Дашборд | Нет отдельного дашборда | Вкладка "Услуги" в общем дашборде |

## Дальнейшая работа

Вы можете:

1. **Добавить свои услуги** в справочник через pgAdmin:
```sql
INSERT INTO services_catalog (name, category, description)
VALUES ('Новая услуга', 'Категория', 'Описание');
```

2. **Импортировать данные массово** через Excel (если создать соответствующий endpoint)

3. **Настроить фильтры** в форме импорта под свои нужды

4. **Расширить аналитику** на дашборде дополнительными графиками

## Поддержка

Если возникли вопросы или ошибки:

1. Проверьте логи сервера в консоли
2. Откройте Developer Tools (F12) → Console для ошибок в браузере
3. Убедитесь, что справочник услуг заполнен
4. Проверьте права доступа (муниципалитет может вносить только свои данные)
