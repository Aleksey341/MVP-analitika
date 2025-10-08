# Деплой MVP-analitika на Amvera

## 🎯 Рекомендуемый подход: Два отдельных проекта

### **Проект 1: Backend API (Node.js + PostgreSQL)**

#### 1. Создание проекта
1. Зайдите на [amvera.ru](https://amvera.ru)
2. Создайте новый проект
3. Выберите **Node.js**
4. Подключите GitHub: `Aleksey341/MVP-analitika`

#### 2. Настройки сборки
```
Build Command: npm install
Start Command: npm start
Root Directory: /
Port: 80
```

**Важно:** Frontend собирается автоматически через postinstall hook при выполнении `npm install`.

#### 3. Environment Variables
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:password@amvera-alex1976-cnpg-reports-system-rw:5432/dbname
DATABASE_URL_RO=postgresql://user:password@amvera-alex1976-cnpg-reports-system-ro:5432/dbname
SESSION_SECRET=генерируйте_случайную_строку_минимум_32_символа
CORS_ORIGINS=https://mvp-analitika-frontend-alex1976.amvera.io
PORT=80
```

#### 4. База данных
- Создайте PostgreSQL проект на Amvera
- Скопируйте connection string в `DATABASE_URL`
- Запустите миграции: `npm run db:init`

#### 5. Deployment
- Нажмите **Deploy**
- URL будет: `https://mvp-analitika-backend-alex1976.amvera.io`

---

### **Проект 2: Frontend (React + Vite)**

#### 1. Создание проекта
1. Создайте еще один проект на Amvera
2. Выберите **Static Site / Vite**
3. Подключите тот же GitHub: `Aleksey341/MVP-analitika`

#### 2. Настройки сборки
```
Build Command: cd frontend && npm install && npm run build
Publish Directory: frontend/dist
Root Directory: /
Framework: Vite
```

#### 3. Environment Variables
```bash
VITE_API_URL=https://mvp-analitika-backend-alex1976.amvera.io
VITE_APP_NAME=Система отчётности
```

#### 4. Deployment
- Нажмите **Deploy**
- URL будет: `https://mvp-analitika-frontend-alex1976.amvera.io`

---

## 🔧 Альтернатива: Один проект (Monolithic)

Если хотите всё в одном проекте (не рекомендуется):

### 1. Настройки на Amvera
```
Framework: Node.js
Build Command: npm run build
Start Command: npm start
Root Directory: /
Port: 80
```

### 2. Обновите server.js
Добавьте роут для React SPA:

```javascript
// В конце server.js, перед 404 handler
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});
```

### 3. Environment Variables
```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=...
```

---

## 📋 Checklist перед деплоем

### Backend
- [ ] `.env.production` создан с правильными переменными
- [ ] CORS настроен для frontend URL
- [ ] База данных создана на Amvera
- [ ] `npm run db:init` выполнен
- [ ] Создан admin пользователь (`npm run create-admin`)

### Frontend
- [ ] `VITE_API_URL` указывает на backend URL
- [ ] Build проходит без ошибок (`npm run build`)
- [ ] Proxy убран (используется только для dev)

---

## 🔍 Проверка после деплоя

### Backend
```bash
# Health check
curl https://ваш-backend.amvera.io/health

# Должен вернуть:
{
  "status": "healthy",
  "database": "connected",
  "version": "1.1.2"
}
```

### Frontend
1. Откройте `https://ваш-frontend.amvera.io`
2. Должно появиться модальное окно авторизации
3. Введите admin креды
4. Должны увидеть карточки разделов

---

## 🐛 Troubleshooting

### Backend не стартует
- Проверьте логи в Amvera
- Убедитесь что `DATABASE_URL` правильный
- Проверьте что PostgreSQL проект запущен

### Frontend не загружается
- Проверьте что build прошел успешно
- Проверьте `VITE_API_URL` в environment
- Откройте DevTools → Network → проверьте API запросы

### CORS ошибки
- Обновите `CORS_ORIGINS` в backend environment
- Перезапустите backend
- Очистите кеш браузера

### 401 Unauthorized
- Проверьте что cookies работают (HttpOnly, SameSite)
- В production должно быть `secure: true`
- Убедитесь что HTTPS используется

---

## 📊 Архитектура на Amvera

```
┌─────────────────────────────────────┐
│  PostgreSQL Project                 │
│  amvera-alex1976-cnpg-reports-rw   │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Backend Project (Node.js)          │
│  mvp-analitika-backend.amvera.io   │
│  - Express API                      │
│  - Session auth                     │
│  - Port 80                          │
└─────────────────┬───────────────────┘
                  │ CORS allowed
                  ▼
┌─────────────────────────────────────┐
│  Frontend Project (Static)          │
│  mvp-analitika-frontend.amvera.io  │
│  - React SPA                        │
│  - Chart.js                         │
│  - Vite build                       │
└─────────────────────────────────────┘
```

---

## 💡 Рекомендации

1. **Используйте разные проекты** для backend и frontend
   - Проще масштабировать
   - Независимый деплой
   - Меньше проблем с билдом

2. **Настройте CI/CD**
   - Auto-deploy при push в main
   - Разделите на ветки (dev, staging, production)

3. **Мониторинг**
   - Следите за логами в Amvera
   - Настройте алерты на ошибки

4. **Backup БД**
   - Amvera делает автобекапы
   - Но лучше настроить свои

---

Generated: 2025-10-08
