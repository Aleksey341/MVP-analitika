#!/bin/bash
# Скрипт для развертывания на Amvera
# Выполните этот файл на сервере

set -e  # Остановка при ошибке

echo "🚀 Начинаем развертывание..."

# 1. Обновление кода
echo "📥 Обновление кода из GitHub..."
git pull origin main

# 2. Установка зависимостей
echo "📦 Установка зависимостей..."
npm install

# 3. Проверка БД
echo "🔍 Проверка состояния базы данных..."
npm run db:check || true

# 4. Инициализация БД
echo "🗄️ Инициализация базы данных..."
npm run db:init

# 5. Загрузка муниципалитетов
echo "📊 Загрузка муниципалитетов..."
npm run db:migrate || echo "⚠️ Миграция пропущена (возможно файл отсутствует)"

# 6. Проверка роутов
echo "🔧 Проверка роутов..."
echo "Роуты в server.js:"
grep -n "app.post.*'/api/reports" server.js || echo "⚠️ Роуты не найдены"

# 7. Финальная проверка
echo "✅ Финальная проверка БД..."
npm run db:check

echo ""
echo "🎉 Развертывание завершено!"
echo ""
echo "📋 ОБЯЗАТЕЛЬНО ПЕРЕЗАПУСТИТЕ СЕРВЕР:"
echo "   pm2 restart all"
echo "   ИЛИ"
echo "   npm start"
echo ""
echo "🔍 После перезапуска проверьте:"
echo "   curl http://localhost/health | jq '.db_mapping'"
echo "   curl http://localhost/api/indicators/form_1_gmu"
echo ""
