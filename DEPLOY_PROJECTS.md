# Инструкция по развертыванию блока "Проекты"

## Описание

Блок "Проекты" заменяет блок "Финансы" в дашборде и отображает данные портфелей проектов из 5 подблоков:
- 🏗️ Портфель проектов МЖКХ (11 проектов)
- 🏛️ Портфель проектов МСиА (4 проекта)
- 🚇 Портфель проектов МТиДХ (5 проектов)
- ⚡ Портфель проектов МЭиТ (2 проекта)
- 🔍 Портфель проектов инспекции Госстройнадзора (8 показателей)

## Что было реализовано

### Backend
- ✅ Таблицы БД: `projects_catalog`, `projects_items`, `projects_data`
- ✅ API эндпоинты:
  - `GET /api/projects/catalog` - список подблоков
  - `GET /api/projects/:catalogCode/items` - проекты подблока
  - `GET /api/projects/:catalogCode/data` - данные по проектам
  - `GET /api/projects/item/:itemId/history` - история проекта
  - `POST /api/projects/data` - добавление/обновление данных

### Frontend
- ✅ Заменен блок "Финансы" на "Проекты"
- ✅ Сетка карточек для 5 подблоков
- ✅ Детальный просмотр с таблицей и графиком
- ✅ Выбор периода (год и месяц)
- ✅ Адаптивный дизайн с темной темой

## Развертывание

### Вариант 1: Автоматическое развертывание (рекомендуется)

```bash
# На сервере Amvera
cd /app
bash scripts/deploy-projects.sh
```

### Вариант 2: Ручное развертывание

#### Шаг 1: Применить миграцию БД
```bash
psql $DATABASE_URL -f database/projects-migration.sql
```

#### Шаг 2: Импортировать данные
```bash
node scripts/import-projects-data.js
```

## Проверка

После развертывания:
1. Откройте https://mvp-analitika-alex1976.amvera.io/dashboard
2. Перейдите на вкладку "📁 Проекты"
3. Должны отобразиться 5 карточек подблоков
4. Нажмите на любую карточку для просмотра деталей
5. Выберите период (2025, Сентябрь) и нажмите "Загрузить данные"

## Структура данных

### Таблица `projects_catalog`
- `id` - первичный ключ
- `code` - код подблока (mjkh, msia, mtidh, meit, gosstroinadzor)
- `name` - название подблока
- `description` - описание
- `sort_order` - порядок сортировки

### Таблица `projects_items`
- `id` - первичный ключ
- `catalog_id` - ссылка на подблок
- `name` - название проекта
- `description` - описание
- `sort_order` - порядок сортировки

### Таблица `projects_data`
- `id` - первичный ключ
- `item_id` - ссылка на проект
- `municipality_id` - муниципалитет (NULL для областных данных)
- `period_year` - год
- `period_month` - месяц
- `dynamic_text` - динамика (текст)
- `dynamic_value` - динамика (число)
- `plan_text` - план (текст)
- `plan_value` - план (число)
- `fact_text` - факт (текст)
- `fact_value` - факт (число)
- `task_value` - задание
- `contract_value` - контрактация
- `contract_percent` - процент контрактации
- `fact_percent` - процент факта
- `objects_plan` - объекты по плану
- `objects_fact` - фактическое выполнение

## Обновление данных

Для добавления данных за новый период:

1. Обновите данные в `scripts/import-projects-data.js`
2. Запустите скрипт:
```bash
node scripts/import-projects-data.js
```

Или используйте API:
```bash
curl -X POST https://mvp-analitika-alex1976.amvera.io/api/projects/data \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "item_id": 1,
    "period_year": 2025,
    "period_month": 10,
    "dynamic_text": "100%",
    "dynamic_value": 100,
    "plan_text": "План на октябрь"
  }'
```

## Файлы проекта

- `database/projects-migration.sql` - миграция БД
- `routes/projects.js` - API маршруты
- `scripts/import-projects-data.js` - скрипт импорта данных
- `scripts/deploy-projects.sh` - скрипт развертывания
- `public/dashboard.html` - фронтенд (строки 563-627, 2543-2737)

## Контакты

В случае вопросов обращайтесь к разработчику.

🤖 Generated with Claude Code
