# 🏗️ Архитектура системы отчётности

## 📐 Общая архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   index.html │  │ dashboard   │  │   form.html │             │
│  │   (Login)    │  │   .html     │  │   (1-ГМУ)   │             │
│  └──────┬───────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                 │                 │                     │
│         └────────┬────────┴────────┬────────┘                    │
│                  │                 │                              │
│         ┌────────▼─────────────────▼────────┐                    │
│         │      Vanilla JavaScript            │                    │
│         │   + Chart.js 4.x + Canvas API     │                    │
│         └────────────────┬───────────────────┘                    │
│                          │                                        │
└──────────────────────────┼────────────────────────────────────────┘
                           │ HTTPS
                           │
┌──────────────────────────▼────────────────────────────────────────┐
│                      API LAYER                                    │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    server.js (Express)                     │  │
│  │                                                            │  │
│  │  • Helmet (Security)                                      │  │
│  │  • Rate Limiting (1000 req/15min)                         │  │
│  │  • Express-session (HTTP-only cookies)                    │  │
│  │  • CORS                                                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ routes/      │  │ middleware/  │  │   config/    │          │
│  │              │  │              │  │              │          │
│  │ • auth.js    │  │ • auth.js    │  │ • database   │          │
│  │ • admin.js   │  │   - requireAuth│  │   .js      │          │
│  │ • gibdd.js   │  │   - requireAdmin│ │   - pool   │          │
│  │ • services.js│  │   - requireRole│  │   - poolRO │          │
│  └──────────────┘  └──────────────┘  └──────┬───────┘          │
│                                               │                   │
└───────────────────────────────────────────────┼───────────────────┘
                                                │ TCP/IP
                                                │
┌───────────────────────────────────────────────▼───────────────────┐
│                     DATABASE LAYER                                │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │           PostgreSQL 17.5 (CNPG Cluster)                   │  │
│  │                                                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │  │   RW Host    │  │   RO Host    │  │   R Host     │    │  │
│  │  │  (Write)     │  │   (Read)     │  │  (Replica)   │    │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │  │
│  │                                                            │  │
│  │  Tables:                                                   │  │
│  │  • municipalities (18 rows)                                │  │
│  │  • users (admin, governor, 18 operators)                   │  │
│  │  • indicators_catalog (35 indicators)                      │  │
│  │  • indicator_values (форма 1-ГМУ данные)                  │  │
│  │  • services_catalog (35 services, 7 categories)           │  │
│  │  • service_values (dashboard data)                         │  │
│  │  • gibdd_reports (ДТП данные)                             │  │
│  │                                                            │  │
│  │  Triggers:                                                 │  │
│  │  • trigger_sync_to_service_values                          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## 🎯 Архитектура дашборда (v2.2)

```
┌─────────────────────────────────────────────────────────────────┐
│                      DASHBOARD.HTML                              │
│                   (Трёхуровневая архитектура)                   │
└─────────────────────────────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  УРОВЕНЬ 1    │    │  УРОВЕНЬ 2    │    │  УРОВЕНЬ 3    │
│   "Обзор"     │    │  Детальные    │    │  Drill-down   │
│               │    │   вкладки     │    │               │
├───────────────┤    ├───────────────┤    ├───────────────┤
│               │    │               │    │               │
│ 4 KPI         │    │ 🚗 ДТП        │    │ Клик на       │
│ + Sparklines  │───▶│ • 3 KPI       │───▶│ Heatmap       │
│               │    │ • Heatmap     │    │ ────────▶     │
│ 2 Mini-graphs │    │ • 8 графиков  │    │ Применить     │
│               │    │               │    │ фильтры       │
│ Quick Links   │    │ 📋 Услуги     │    │               │
│               │    │ • 4 KPI       │    │ Обновить все  │
│               │    │ • 4 графика   │    │ графики       │
│               │    │               │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
```

## 🔄 Поток данных

### 1. Загрузка дашборда

```
User открывает /dashboard
         │
         ▼
   checkAuth()
         │
    ┌────┴────┐
    │         │
   NO        YES
    │         │
    ▼         ▼
  Login   loadOverviewData()
  Modal        │
               ├─▶ Fetch /api/services-dashboard/data
               │   └─▶ PostgreSQL (poolRO)
               │       └─▶ SELECT service_values + JOIN
               │
               ├─▶ Fetch /api/gibdd/data
               │   └─▶ PostgreSQL (poolRO)
               │       └─▶ SELECT gibdd_reports + JOIN
               │
               ├─▶ updateKPI() → animateValue()
               │                   └─▶ 800ms счётчик
               │
               ├─▶ drawSparkline() → Canvas API
               │                     └─▶ 120×30px trend
               │
               └─▶ renderOverviewServicesChart()
                   └─▶ Chart.js → fade-in 400ms
```

### 2. Quick Filter → Обновление данных

```
User кликает "📊 Текущий квартал"
         │
         ▼
  applyQuickFilter('current-quarter')
         │
         ├─▶ Установить даты (текущий год, последние 3 мес)
         ├─▶ Скрыть custom filters
         ├─▶ Добавить класс .active
         │
         ▼
  refreshDashboard()
         │
         ├─▶ Добавить .updating → pulse animation
         │
         ├─▶ Promise.all([
         │     renderMonthlyDynamics(),
         │     renderHeatmapDTP(),
         │     renderPeriodComparison(),
         │     ...8 графиков
         │   ])
         │
         ├─▶ Каждый график:
         │   • fetch('/api/gibdd/data?period=...')
         │   • updateChart() → fade-in 400ms
         │   • Chart.js animation: 800ms easeInOutQuart
         │
         └─▶ Убрать .updating после 1500ms
```

### 3. Heatmap → Drill-down

```
User кликает на ячейку Heatmap
         │
         ▼
  onHeatmapClick(municipalityId, month)
         │
         ├─▶ $('#municipality').value = municipalityId
         ├─▶ $('#month').value = month
         ├─▶ Переключить на "Настроить" filter
         ├─▶ Показать custom filters
         │
         ▼
  loadKPIData() + refreshDashboard()
         │
         ├─▶ Fetch новые данные с фильтрами
         ├─▶ updateKPI() → animateValue() для всех 3 KPI
         ├─▶ Перерисовать все 8 графиков
         │
         └─▶ showBanner("Фильтры применены: ...")
             └─▶ Автоскрытие через 2000ms
```

## 🗄️ Структура базы данных

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA                               │
└─────────────────────────────────────────────────────────────────┘

municipalities               users                  indicators_catalog
┌──────────────┐            ┌──────────────┐       ┌──────────────┐
│ id (PK)      │            │ id (PK)      │       │ id (PK)      │
│ name         │◀───────────│ municipality │       │ name         │
│ code         │            │   _id (FK)   │       │ unit         │
│ region       │            │ password_hash│       │ category     │
└──────────────┘            │ role         │       └──────────────┘
                            │ is_active    │              │
                            │ password_    │              │
                            │   reset_req  │              │
                            └──────────────┘              │
                                                          │
indicator_values                                          │
┌──────────────────────┐                                 │
│ id (PK)              │                                 │
│ municipality_id (FK) │─────────────────────────────────┤
│ service_id (FK)      │────────┐                        │
│ indicator_id (FK)    │◀───────┼────────────────────────┘
│ period_year          │        │
│ period_month         │        │
│ value_numeric        │        │
│ created_at           │        │
│ updated_at           │        │
└──────────────────────┘        │
         │                      │
         │ TRIGGER              │
         │ sync_to_service      │
         │                      │
         ▼                      │
service_values                  │
┌──────────────────────┐        │
│ id (PK)              │        │
│ municipality_id (FK) │        │
│ service_id (FK)      │◀───────┘
│ period_year          │
│ period_month         │
│ value_numeric        │
│ created_at           │
│ updated_at           │
└──────────────────────┘
         │
         └──▶ Используется для дашборда "Услуги"


services_catalog
┌──────────────┐
│ id (PK)      │
│ name         │
│ category     │
│ description  │
└──────────────┘
       │
       └──▶ 35 services in 7 categories:
            • МФЦ
            • ЗАГС
            • Социальная поддержка
            • ЖКХ
            • Образование
            • Здравоохранение
            • Культура и спорт


gibdd_reports
┌──────────────────────┐
│ id (PK)              │
│ municipality_id (FK) │
│ period_year          │
│ period_month         │
│ dtp_total            │
│ dtp_total_dead       │
│ dtp_total_injured    │
│ dtp_collision        │
│ dtp_pedestrian       │
│ ... (30+ fields)     │
└──────────────────────┘
```

## 🎨 Frontend архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND COMPONENTS                           │
└─────────────────────────────────────────────────────────────────┘

public/
│
├── index.html                    [Авторизация + Главная]
│   ├── Modal login window
│   ├── Role-based cards
│   └── Theme switcher
│
├── dashboard.html                [Главный дашборд] ★★★
│   │
│   ├── TAB 1: "Обзор" ────────────────────────┐
│   │   ├── 4 KPI cards                        │
│   │   │   ├── Services (с YoY)               │
│   │   │   ├── ДТП (с трендом)                │
│   │   │   ├── Погибшие                       │
│   │   │   └── Ранено                         │
│   │   ├── Sparklines (Canvas API)            │
│   │   ├── 2 mini graphs (Chart.js)           │
│   │   └── Quick links                        │
│   │                                           │
│   ├── TAB 2: "ДТП (ГИБДД)" ───────────────────┤
│   │   ├── 3 KPI cards (с анимацией)          │
│   │   ├── Heatmap 10×12 (6 levels)           │
│   │   │   └── onclick → drill-down           │
│   │   └── 8 charts:                          │
│   │       ├── Monthly dynamics (line)        │
│   │       ├── Period comparison (bar)        │
│   │       ├── Top municipalities (bar)       │
│   │       ├── Accident categories (pie)      │
│   │       ├── Locations (doughnut)           │
│   │       ├── Victims by age (bar)           │
│   │       └── Special cases (doughnut)       │
│   │                                           │
│   ├── TAB 3: "Услуги" ────────────────────────┤
│   │   ├── 4 KPI cards                        │
│   │   └── 4 charts:                          │
│   │       ├── Monthly dynamics               │
│   │       ├── Top-10 services                │
│   │       ├── Categories (pie)               │
│   │       └── Municipalities comparison      │
│   │                                           │
│   ├── Quick Filters (5 buttons)              │
│   │   ├── Current month                      │
│   │   ├── Current quarter                    │
│   │   ├── Current year (default)             │
│   │   ├── Last year                          │
│   │   └── Custom                             │
│   │                                           │
│   └── Animations & Effects                   │
│       ├── animateValue() - 800ms counter     │
│       ├── updateChart() - fade-in 400ms      │
│       ├── Chart.js - easeInOutQuart 800ms    │
│       ├── pulse indicator                    │
│       ├── scale-in для KPI                   │
│       └── shimmer skeleton                   │
│
├── form.html                     [Форма 1-ГМУ]
│   └── Excel import
│
├── gibdd.html                    [Форма ГИБДД]
│   └── ДТП reporting
│
├── finance.html                  [Финансы]
│
├── change-password.html          [Смена пароля]
│
├── theme.js                      [Темы: dark/light]
│   ├── localStorage persistence
│   └── Auto-update charts
│
└── styles.css                    [Глобальные стили]
```

## 🔐 Безопасность

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                               │
└─────────────────────────────────────────────────────────────────┘

LEVEL 1: Transport
├── HTTPS (TLS 1.2+)
└── Strict-Transport-Security header

LEVEL 2: Application
├── Helmet
│   ├── Content-Security-Policy
│   ├── X-Frame-Options: DENY
│   ├── X-Content-Type-Options: nosniff
│   └── X-XSS-Protection
├── Rate Limiting
│   └── 1000 requests / 15 minutes per IP
└── CORS
    └── Same-origin policy

LEVEL 3: Authentication
├── bcrypt (10 rounds)
│   └── Password hashing
├── Express-session
│   ├── HTTP-only cookies
│   ├── Secure flag (production)
│   ├── SameSite: strict
│   └── Session timeout
└── Password policies
    ├── Min 6 characters
    ├── password_reset_required flag
    └── last_password_change tracking

LEVEL 4: Authorization
├── Middleware chain
│   ├── requireAuth()
│   ├── requireAdmin()
│   ├── requireRole(role)
│   └── requireMunicipalityAccess()
└── Role hierarchy
    ├── admin (full access)
    ├── governor (read-only dashboard)
    └── operator (own municipality only)

LEVEL 5: Database
├── Parameterized queries (SQL injection prevention)
├── Read/Write separation
│   ├── pool (RW) - для записи
│   └── poolRO (RO) - для чтения
├── Foreign key constraints
└── UNIQUE constraints
```

## 📊 Performance optimization

```
┌─────────────────────────────────────────────────────────────────┐
│                   PERFORMANCE STRATEGIES                         │
└─────────────────────────────────────────────────────────────────┘

DATABASE
├── Connection pooling
│   ├── pool (RW): min 2, max 10
│   └── poolRO (RO): min 2, max 20
├── Read replica usage
│   └── 80% запросов → poolRO
├── Indexes
│   ├── municipalities (id)
│   ├── users (municipality_id)
│   ├── indicator_values (municipality_id, period)
│   └── service_values (municipality_id, service_id, period)
└── Query optimization
    └── JOINs only when necessary

FRONTEND
├── Canvas API для sparklines
│   └── 3× быстрее SVG
├── Chart.js lazy loading
│   └── Charts инициализируются только при открытии вкладки
├── Skeleton loading
│   └── Мгновенный UI feedback
├── requestAnimationFrame
│   └── 60 FPS для анимаций
└── CSS animations
    └── GPU-accelerated (transform, opacity)

CACHING
├── Session cache (in-memory)
├── Static assets caching
└── Browser localStorage
    └── Theme preference
```

## 🚀 Deployment (Amvera Cloud)

```
┌─────────────────────────────────────────────────────────────────┐
│                    AMVERA DEPLOYMENT                             │
└─────────────────────────────────────────────────────────────────┘

GitHub Repository
      │
      │ git push
      │
      ▼
Amvera CI/CD Pipeline
      │
      ├─▶ npm install
      ├─▶ Health check
      │
      ▼
Docker Container (Node.js 18)
      │
      ├── Environment Variables
      │   ├── DB_HOST_RW
      │   ├── DB_HOST_RO
      │   ├── DB_HOST_R
      │   ├── DB_PASSWORD
      │   ├── SESSION_SECRET
      │   └── NODE_ENV=production
      │
      ├── Expose PORT 80
      │
      └── Start: npm start
            └─▶ node server.js

PostgreSQL CNPG Cluster
      │
      ├── Primary (RW)
      ├── Standby (RO)
      └── Replica (R)

Load Balancer
      │
      └─▶ HTTPS → reports-system-alex1976.amvera.io
```

## 📈 Мониторинг

```
Health Check Endpoint: /health
      │
      ├─▶ Status: ok/error
      ├─▶ Database: connected/disconnected
      ├─▶ Uptime: seconds
      └─▶ Timestamp: ISO 8601

Logs:
      ├── [SQL] - Database queries
      ├── [AUTH] - Authentication events
      ├── [ERROR] - Stack traces
      └── HTTP access logs
```

## 🔄 Data Flow для импорта услуг

```
User открывает /form.html
      │
      ▼
Загружает Excel файл
      │
      ├─▶ POST /api/import/service-values
      │   └─▶ ExcelJS парсит файл
      │       └─▶ Валидация данных
      │           └─▶ INSERT INTO indicator_values
      │
      ▼
TRIGGER: trigger_sync_to_service_values
      │
      ├─▶ Автоматически копирует в service_values
      │   └─▶ SUM(value_numeric) GROUP BY service_id
      │
      ▼
Данные доступны в дашборде
      │
      └─▶ /api/services-dashboard/data
          └─▶ SELECT FROM service_values
              └─▶ Chart.js отрисовка
```

---

**Архитектура**: v2.2
**Дата**: Январь 2025
**Статус**: Production Ready ✅
