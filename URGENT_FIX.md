# 🚨 СРОЧНОЕ ИСПРАВЛЕНИЕ - Ошибки 500 и 404

## Проблемы

1. ❌ Ошибка 500 при сохранении отчета
2. ❌ Ошибка 404 при экспорте в Excel (`/api/reports/export`)
3. ❌ Данные не отображаются на других формах

## Диагностика

### На сервере выполните:

```bash
# 1. Проверка БД
npm run db:check
```

**Если видите ошибки - ОБЯЗАТЕЛЬНО выполните:**

```bash
# 2. Инициализация БД
npm run db:init

# 3. Загрузка муниципалитетов
npm run db:migrate

# 4. ПЕРЕЗАПУСК СЕРВЕРА (критически важно!)
# Остановите текущий процесс и запустите заново:
npm start
```

### Проверка в логах сервера

**При старте сервера ищите строку:**
```
DB mapping: { indicatorsCatalog: '...', indicatorValues: '...', ... }
```

**Если `indicatorValues: null` - БД НЕ инициализирована!**

## Быстрое решение

### Вариант 1: Через SSH на Amvera

```bash
# Подключитесь к серверу
ssh your-amvera-instance

# Перейдите в папку проекта
cd /path/to/reports-system

# Проверка
npm run db:check

# Инициализация (если нужно)
npm run db:init

# Перезапуск
pm2 restart all
# или
systemctl restart your-app-service
```

### Вариант 2: Через Amvera Dashboard

1. Откройте Amvera Dashboard
2. Перейдите в раздел "Environment Variables"
3. Убедитесь, что установлены:
   ```
   DB_HOST=amvera-alex1976-cnpg-reports-db-rw
   DB_PORT=5432
   DB_NAME=reports
   DB_USER=reports_admin
   DB_PASSWORD=Qwerty12345!
   ```
4. Перейдите в "Console" или "SSH"
5. Выполните:
   ```bash
   npm run db:init
   ```
6. Перезапустите приложение через Dashboard

### Вариант 3: SQL напрямую

Если есть доступ к PostgreSQL:

```sql
-- Проверка таблиц
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Если таблиц нет, выполните файлы:
\i database/schema.sql
\i database/seed_data.sql
```

## Почему возникают ошибки

### Ошибка 500 при сохранении
**Причина:** `DB.indicatorValues = null`
- Таблица `indicator_values` не создана
- Или создана после запуска сервера (нужен рестарт)

### Ошибка 404 при экспорте Excel
**Причина:** Роут `/api/reports/export` не зарегистрирован
- Проверьте, что в `server.js` есть строка 435-539
- Возможно старая версия кода на сервере

**Решение:**
```bash
git pull origin main
npm start
```

### Данные не отображаются
**Причины:**
1. БД не инициализирована (нет данных)
2. API возвращает пустые массивы
3. JS-ошибки на клиенте

## Проверочный чеклист

- [ ] База данных создана и инициализирована (`npm run db:check`)
- [ ] Таблицы содержат данные:
  - `municipalities` - минимум 1 запись
  - `indicators_catalog` - 10 записей (form_1_gmu)
  - `services_catalog` - 25 записей
- [ ] Код на сервере актуален (`git pull origin main`)
- [ ] Сервер перезапущен ПОСЛЕ инициализации БД
- [ ] В логах при старте: `DB mapping` показывает все таблицы
- [ ] Форма открывается без JS-ошибок (F12 → Console)
- [ ] API отвечают:
  - GET /api/municipalities → список
  - GET /api/indicators/form_1_gmu → 10+ показателей
  - GET /api/service-categories → категории
  - GET /api/services → услуги

## Команды для быстрой проверки

```bash
# Проверка API (замените localhost на ваш домен)
curl http://localhost/api/municipalities
curl http://localhost/api/indicators/form_1_gmu
curl http://localhost/api/service-categories

# Должны вернуть JSON с данными, а не []
```

## Если ничего не помогает

### Полная переустановка:

```bash
# 1. Остановить сервер
pm2 stop all

# 2. Очистить старую БД (ВНИМАНИЕ: удалит все данные!)
# Войдите в psql:
psql -U reports_admin -d reports

# В psql:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
\q

# 3. Инициализация с нуля
npm run db:init
npm run db:migrate

# 4. Запуск
npm start
```

## Контрольная проверка

После исправления откройте:

1. **Форма:** http://your-domain/form
   - Должны загрузиться муниципалитеты
   - Должны загрузиться категории услуг
   - При выборе категории → услуги
   - При выборе услуги → разблокируется таблица
   - Заполнение и сохранение работает

2. **Дашборд:** http://your-domain/dashboard
   - Выпадающие списки заполнены
   - График отображается

3. **Главная:** http://your-domain/
   - Статистика показывает цифры

## Логи для отладки

**Включите в .env:**
```env
NODE_ENV=development
LOG_LEVEL=debug
```

**Смотрите логи:**
```bash
# Логи приложения
pm2 logs

# Или
tail -f /var/log/app.log
```

**Ищите:**
- `[SAVE REPORT] Error:` - ошибки сохранения
- `DB mapping:` - какие таблицы найдены
- `Failed to resolve tables` - не удалось найти таблицы
