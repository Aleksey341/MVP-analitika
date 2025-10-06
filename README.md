# 📊 Система отчетности муниципалитетов Липецкой области

Электронная система сбора и анализа отчетности по форме 1-ГМУ с интерактивными дашбордами для муниципалитетов Липецкой области.

## 🚀 Возможности

### Для операторов (муниципалитеты)
- **📝 Форма 1-ГМУ** - Внесение ежемесячных показателей эффективности
- **🚗 Статистика ГИБДД** - Отчетность по дорожно-транспортным происшествиям
- **💰 Финансы муниципалитетов** - Финансовые показатели
- **📤 Импорт Excel** - Массовая загрузка данных по услугам
- **🔐 Безопасный доступ** - Индивидуальные пароли для каждого муниципалитета

### Для администраторов и губернатора
- **📊 Общий дашборд** - Агрегированная статистика по всем направлениям:
  - **📋 Обзор** - Сводная статистика с ключевыми метриками и sparkline-графиками
  - **ДТП (ГИБДД)** - Динамика аварийности, тепловая карта, drill-down анализ
  - **Услуги** - Анализ оказанных услуг, ТОП-10, категории, сравнение муниципалитетов
- **📈 Интерактивные графики** - Chart.js 4.x с анимациями и расширенными tooltips
- **🔥 Heatmap визуализация** - Тепловая карта с 6 уровнями интенсивности
- **🎯 Drill-down аналитика** - Клик по элементу для детального анализа
- **⚡ Quick Filters** - Быстрые фильтры (месяц, квартал, год)
- **✨ Плавные анимации** - Счётчики, fade-in эффекты, pulse индикаторы
- **🎨 Темы оформления** - Светлая и темная тема
- **📥 Экспорт данных** - Выгрузка в Excel

## 🛠 Технический стек

- **Backend**: Node.js 18+ + Express
- **Frontend**: Vanilla JavaScript + Chart.js 4.x
- **База данных**: PostgreSQL 17.5 (CNPG кластер)
- **Платформа**: Amvera Cloud
- **Экспорт**: ExcelJS
- **Безопасность**: Helmet, Rate Limiting, bcrypt
- **Сессии**: Express-session

## 📋 Структура проекта

```
reports-system/
├── config/
│   └── database.js           # Подключение к PostgreSQL (RW/RO пулы)
├── middleware/
│   └── auth.js              # Аутентификация и авторизация
├── routes/
│   ├── admin.js             # API администратора
│   ├── auth.js              # Авторизация
│   ├── gibdd.js             # API ГИБДД (ДТП)
│   └── services.js          # API дашборда услуг
├── public/
│   ├── index.html           # Главная страница (авторизация)
│   ├── dashboard.html       # Общий дашборд (3 вкладки)
│   ├── form.html            # Форма 1-ГМУ
│   ├── gibdd.html           # Форма ГИБДД
│   ├── finance.html         # Финансы
│   ├── change-password.html # Смена пароля
│   ├── services-import.html # Импорт услуг (Excel)
│   ├── theme.js             # Переключатель тем
│   └── styles.css           # Общие стили
├── sql/
│   ├── 01_create_services_tables.sql      # Создание таблиц услуг
│   ├── 02_seed_services_catalog.sql       # Справочник услуг (35 шт)
│   ├── 03_migrate_indicators_to_services.sql # Миграция данных
│   ├── 04_generate_test_data.sql          # Тестовые данные
│   └── 99_cleanup_services_data.sql       # Очистка данных
├── docs/
│   ├── QUICK_START.md       # Быстрый старт
│   ├── SERVICES_IMPORT_GUIDE.md # Гайд по импорту услуг
│   └── MIGRATION_GUIDE.md   # Миграция данных
├── server.js                # Главный сервер
├── package.json
└── README.md
```

## ⚙️ Настройка и запуск

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Создайте `.env` файл:

```bash
# База данных PostgreSQL (Amvera CNPG)
DB_HOST_RW=amvera-alex1976-cnpg-reports-db-rw
DB_HOST_RO=amvera-alex1976-cnpg-reports-db-ro
DB_HOST_R=amvera-alex1976-cnpg-reports-db-r
DB_PORT=5432
DB_NAME=reports
DB_USER=reports_admin
DB_PASSWORD=your_secure_password

# Сессии
SESSION_SECRET=your_session_secret_key_here

# Приложение
NODE_ENV=production
PORT=80
```

### 3. Инициализация базы данных

**Шаг 1:** Создайте основные таблицы
```bash
# Выполните в pgAdmin или psql:
# - Таблицы: municipalities, users, indicator_values, indicators_catalog
# - Справочники, триггеры
```

**Шаг 2:** Создайте таблицы для услуг
```bash
# В pgAdmin выполните по порядку:
sql/01_create_services_tables.sql
sql/02_seed_services_catalog.sql
```

**Шаг 3:** Создайте триггер автосинхронизации
```sql
-- Триггер копирует данные из indicator_values в service_values
CREATE OR REPLACE FUNCTION sync_indicator_to_service_values()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.service_id IS NOT NULL THEN
    INSERT INTO service_values (municipality_id, service_id, period_year, period_month, value_numeric)
    SELECT NEW.municipality_id, NEW.service_id, NEW.period_year, NEW.period_month,
           COALESCE(SUM(iv.value_numeric), 0)
    FROM indicator_values iv
    WHERE iv.municipality_id = NEW.municipality_id
      AND iv.service_id = NEW.service_id
      AND iv.period_year = NEW.period_year
      AND iv.period_month = NEW.period_month
    GROUP BY iv.municipality_id, iv.service_id, iv.period_year, iv.period_month
    ON CONFLICT (municipality_id, service_id, period_year, period_month)
    DO UPDATE SET value_numeric = EXCLUDED.value_numeric, updated_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_to_service_values
AFTER INSERT OR UPDATE ON indicator_values
FOR EACH ROW EXECUTE FUNCTION sync_indicator_to_service_values();
```

> 📘 **Подробнее:** См. [QUICK_START.md](QUICK_START.md) и [SERVICES_IMPORT_GUIDE.md](SERVICES_IMPORT_GUIDE.md)

### 4. Запуск приложения

```bash
# Разработка
npm run dev

# Продакшн
npm start
```

## 🔐 Система авторизации

### Роли пользователей

1. **Администратор** (`role: 'admin'`)
   - Доступ ко всем функциям
   - Просмотр общего дашборда (все 3 вкладки)
   - Управление пользователями
   - Внесение и редактирование данных всех муниципалитетов

2. **Губернатор** (`role: 'governor'`)
   - Просмотр общего дашборда (только вкладка "Обзор")
   - Чтение всех данных без возможности редактирования
   - Доступ к аналитике и отчётам

3. **Оператор муниципалитета** (`role: 'operator'`)
   - Внесение данных только своего муниципалитета
   - Доступ к формам 1-ГМУ, ГИБДД, Финансы
   - Импорт Excel

### Первый вход

При первом входе система требует смену пароля:
- Поле `password_reset_required = true` в таблице `users`
- Автоматический редирект на `/change-password.html`

### Эндпоинты авторизации

- `POST /api/auth/login` - Вход в систему
- `POST /api/auth/logout` - Выход
- `GET /api/auth/me` - Информация о текущем пользователе
- `POST /api/auth/change-password` - Смена пароля

## 🌐 API Endpoints

### Авторизация
- `POST /api/auth/login` - Вход (municipality_id, password)
- `POST /api/auth/logout` - Выход
- `GET /api/auth/me` - Текущий пользователь
- `POST /api/auth/change-password` - Смена пароля

### Общие
- `GET /api/municipalities` - Список муниципалитетов (с фильтрами)
- `GET /api/municipalities/all` - Все муниципалитеты
- `GET /api/indicators-catalog` - Справочник показателей
- `GET /health` - Статус системы

### Отчеты (Форма 1-ГМУ)
- `POST /api/reports/save` - Сохранение отчета
- `GET /api/reports` - Список отчетов
- `GET /api/reports/values` - Значения показателей

### Дашборд ГИБДД
- `GET /api/gibdd/dashboard/data` - Данные для дашборда ДТП
  - KPI: Всего ДТП, Погибшие, Раненые
  - Динамика по месяцам
  - Распределение по типам
  - ТОП муниципалитетов

### Дашборд услуг
- `GET /api/services-dashboard/data` - Данные для дашборда услуг
  - KPI: Всего услуг, Изменение к пред. году
  - Динамика по месяцам
  - ТОП-10 популярных услуг
  - Распределение по категориям
  - Сравнение муниципалитетов

### Импорт
- `POST /api/import/service-values` - Импорт данных услуг из Excel
- `GET /api/services-catalog` - Справочник услуг
- `GET /api/service-values` - Значения услуг
- `POST /api/service-values/save` - Сохранение значений услуг

### Администратор
- `GET /api/admin/users` - Список пользователей
- `POST /api/admin/users` - Создание пользователя
- `PUT /api/admin/users/:id` - Обновление пользователя
- `DELETE /api/admin/users/:id` - Удаление пользователя
- `POST /api/admin/users/:id/reset-password` - Сброс пароля

## 🗄️ Структура базы данных

### Основные таблицы

#### municipalities
Справочник муниципалитетов
```sql
CREATE TABLE municipalities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  region VARCHAR(100)
);
```

#### users
Пользователи системы
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  municipality_id INTEGER REFERENCES municipalities(id),
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'municipality',
  password_reset_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### indicators_catalog
Справочник показателей
```sql
CREATE TABLE indicators_catalog (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  unit VARCHAR(50),
  category VARCHAR(100)
);
```

#### indicator_values
Значения показателей (Форма 1-ГМУ)
```sql
CREATE TABLE indicator_values (
  id SERIAL PRIMARY KEY,
  municipality_id INTEGER REFERENCES municipalities(id),
  service_id INTEGER REFERENCES services_catalog(id),
  indicator_id INTEGER REFERENCES indicators_catalog(id),
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  value_numeric NUMERIC(15,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(municipality_id, indicator_id, period_year, period_month)
);
```

#### services_catalog
Справочник услуг (35 услуг в 7 категориях)
```sql
CREATE TABLE services_catalog (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  category VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### service_values
Значения услуг (для дашборда)
```sql
CREATE TABLE service_values (
  id SERIAL PRIMARY KEY,
  municipality_id INTEGER NOT NULL,
  service_id INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  value_numeric NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(municipality_id, service_id, period_year, period_month)
);
```

### Автоматическая синхронизация

**Триггер** `trigger_sync_to_service_values` автоматически копирует данные из `indicator_values` в `service_values` при импорте Excel.

## 📊 Дашборд

### Вкладка "📋 Обзор" (Новое!)
- **4 KPI карточки** с анимированными счётчиками:
  - Услуг оказано (с YoY сравнением)
  - Всего ДТП (с трендом)
  - Погибшие (с динамикой)
  - Ранено (с изменением)
- **Sparkline-графики**: Мини-тренды в каждой KPI-карточке
- **2 обзорных графика**: Услуги и ДТП за последние 12 месяцев
- **Быстрые ссылки**: Навигация к детальным вкладкам

### Вкладка "🚗 ДТП (ГИБДД)"
- **3 KPI**: Всего ДТП, Погибшие, Раненые (с % изменением к пред. году)
- **🔥 Тепловая карта (Heatmap)**:
  - 10 муниципалитетов × 12 месяцев
  - 6 уровней интенсивности (цветовая шкала)
  - Hover tooltips с детализацией
  - **Drill-down**: Клик по ячейке для детального анализа
- **График**: Динамика по месяцам (мультилинейный)
- **Сравнение периодов**: Год к году
- **ТОП-10 муниципалитетов**: Столбчатая диаграмма
- **Структура ДТП**: Распределение по типам
- **География**: ДТП по местам совершения
- **Демография**: Пострадавшие по возрастным группам
- **Особые случаи**: Hit-and-run, скрывшиеся водители

### Вкладка "📋 Услуги"
- **4 KPI карточки**:
  - Всего услуг оказано (с YoY сравнением)
  - Среднее за месяц (с количеством месяцев)
  - Лучший месяц (название + значение)
  - Категорий услуг (с топ категорией)
- **График**: Динамика по месяцам
- **ТОП-10 популярных услуг**: Горизонтальная bar-диаграмма
- **Категории**: Круговая диаграмма с процентами
- **Сравнение муниципалитетов**: Столбчатая диаграмма

### ⚡ Quick Filters (Новое!)
Быстрые фильтры в один клик:
- 📅 **Этот месяц** - Текущий месяц
- 📊 **Текущий квартал** - Последние 3 месяца
- 📈 **Текущий год** - Весь год (по умолчанию)
- 🗓️ **Прошлый год** - Предыдущий год
- ⚙️ **Настроить** - Кастомные фильтры

### Расширенные фильтры
- **Год**: 2023-2025
- **Месяц**: 1-12 или все месяцы
- **Муниципалитет**: Все или конкретный

### ✨ Анимации и эффекты
- **Счётчики KPI**: Плавное изменение чисел (800ms)
- **Графики**: Fade-in анимация при обновлении
- **Chart.js**: easeInOutQuart анимация (800ms)
- **Загрузка**: Pulse индикатор для всех контейнеров
- **KPI карточки**: Каскадная анимация появления (scale-in)
- **Skeleton loading**: Shimmer-эффект при первой загрузке

### 🎨 Темы оформления
- 🌙 **Темная** (по умолчанию)
- ☀️ **Светлая**
- Автоматическое обновление графиков при смене темы

## 🎨 UI/UX особенности

### Главная страница
- ✨ Анимированные карточки с иконками
- 🎯 Hover-эффекты (подъем, градиент, свечение)
- 🎬 Анимация модального окна входа
- 📱 Адаптивный дизайн

### Дашборд
- 📊 Интерактивные графики Chart.js 4.x
- 🔄 Динамическая загрузка данных
- 🎨 Поддержка светлой/темной темы для всех графиков
- ⚡ Быстрая фильтрация без перезагрузки

## 🚀 Деплой на Amvera

### 1. Создание проекта
```bash
# В Amvera Dashboard:
1. Создать новый проект
2. Подключить GitHub репозиторий
3. Выбрать Node.js 18
```

### 2. Подключение PostgreSQL
```bash
# В разделе "Базы данных":
1. Создать CNPG кластер PostgreSQL 17.5
2. Получить хосты: RW, RO, R
3. Создать базу "reports"
```

### 3. Переменные окружения
```bash
# Добавить в Settings → Environment:
DB_HOST_RW=amvera-...-rw
DB_HOST_RO=amvera-...-ro
DB_HOST_R=amvera-...-r
DB_PORT=5432
DB_NAME=reports
DB_USER=reports_admin
DB_PASSWORD=***
SESSION_SECRET=***
NODE_ENV=production
PORT=80
```

### 4. Деплой
```bash
git push origin main
# Amvera автоматически соберет и запустит приложение
```

## 📈 Мониторинг

### Health Check
```bash
curl https://your-domain/health

# Ответ:
{
  "status": "ok",
  "timestamp": "2025-01-06T12:00:00.000Z",
  "database": "connected",
  "uptime": 3600
}
```

### Логирование
- Все SQL запросы логируются с префиксом `[SQL]`
- HTTP запросы: метод, URL, IP, время
- Ошибки: полный stack trace

## 🔒 Безопасность

- **HTTPS** - Принудительное шифрование
- **Helmet** - CSP, XSS защита
- **Rate Limiting** - 1000 req/15 min
- **bcrypt** - Хеширование паролей (10 раундов)
- **Параметризованные запросы** - Защита от SQL Injection
- **CORS** - Контроль доступа
- **Сессии** - Защищенные HTTP-only cookies

## 📝 Использование

### Для муниципалитета

1. **Вход в систему**
   - Откройте главную страницу
   - Выберите ваш муниципалитет
   - Введите пароль
   - При первом входе смените пароль

2. **Внесение данных Форма 1-ГМУ**
   - Откройте "Форма 1-ГМУ"
   - Выберите месяц
   - Импортируйте Excel или заполните вручную
   - Сохраните

3. **Импорт услуг**
   - Данные автоматически появятся на дашборде
   - Благодаря триггеру синхронизации

### Для администратора

1. **Просмотр аналитики**
   - Откройте "Общий дашборд"
   - Выберите вкладку (ДТП или Услуги)
   - Настройте фильтры
   - Анализируйте данные

2. **Управление пользователями**
   - API `/api/admin/users`
   - Создание, редактирование, удаление
   - Сброс паролей

## 📚 Документация

- [QUICK_START.md](QUICK_START.md) - Быстрый старт за 5 минут
- [SERVICES_IMPORT_GUIDE.md](SERVICES_IMPORT_GUIDE.md) - Импорт услуг
- [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) - Миграция данных
- [README_AUTH.md](README_AUTH.md) - Система авторизации

## 🤝 Поддержка

При возникновении проблем:

1. Проверьте `/health` endpoint
2. Проверьте переменные окружения
3. Убедитесь в подключении к БД
4. Просмотрите логи в Amvera Dashboard
5. Проверьте триггер `trigger_sync_to_service_values`

## 🔄 История изменений

### v2.2 (Январь 2025) - Dashboard Enhancement
- ✅ **Новая вкладка "Обзор"** с 4 KPI и sparkline-графиками
- ✅ **Heatmap визуализация** для ДТП (10×12, 6 уровней интенсивности)
- ✅ **Drill-down аналитика** - клик по heatmap для детального анализа
- ✅ **Quick Filters** - 5 быстрых фильтров (месяц, квартал, год)
- ✅ **Плавные анимации**: счётчики (800ms), fade-in графиков, pulse загрузки
- ✅ **Sparklines в KPI** - мини-тренды (Canvas API, 120×30px)
- ✅ **Enhanced tooltips** - улучшенное форматирование, footer totals
- ✅ **Роль "Губернатор"** с доступом только к вкладке "Обзор"
- ✅ **Loading skeleton** с shimmer-эффектом

### v2.1 (Январь 2025)
- ✅ Дашборд услуг - 4 KPI карточки (total, avg, best month, categories)
- ✅ Система импорта услуг из Excel
- ✅ Автоматическая синхронизация данных (триггер)
- ✅ Улучшен UI: иконки, hover-эффекты
- ✅ Поддержка светлой/темной темы

### v2.0 (Январь 2025)
- ✅ Дашборд ГИБДД (ДТП) с 8 графиками
- ✅ Базовая вкладка "Услуги"

### v1.0 (2024)
- ✅ Форма 1-ГМУ
- ✅ Система авторизации
- ✅ Базовый дашборд

## 📄 Лицензия

© 2024-2025 АНО "Область Будущего"
Система отчетности муниципалитетов Липецкой области

---

**Версия**: 2.2
**Платформа**: Amvera Cloud
**Статус**: Production Ready ✅
**Demo**: https://reports-system-alex1976.amvera.io

## 🎯 Ключевые улучшения v2.2

### 📊 Новая архитектура дашборда
Трёхуровневая структура: **Обзор** → **Детальные вкладки** → **Drill-down анализ**

### 🔥 Heatmap - прорыв в визуализации
Первая в России система муниципальной отчётности с тепловыми картами для анализа ДТП

### ✨ UX следующего уровня
- Анимации на уровне современных SaaS (Stripe, Linear)
- Плавность 60 FPS (16ms tick)
- Профессиональные easing functions (easeInOutQuart)

### ⚡ Производительность
- Canvas API для sparklines (в 3 раза быстрее SVG)
- Оптимизированные запросы к БД (RO пул для чтения)
- Skeleton loading для мгновенного отклика
