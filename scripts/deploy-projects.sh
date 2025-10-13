#!/bin/bash
# Скрипт для развертывания блока "Проекты"
# Применяет миграцию БД и импортирует данные

set -e

echo "🚀 Начинаем развертывание блока 'Проекты'..."

# 1. Применяем миграцию БД
echo ""
echo "📊 Применяем миграцию БД..."
psql $DATABASE_URL -f database/projects-migration.sql

if [ $? -eq 0 ]; then
  echo "✅ Миграция БД успешно применена"
else
  echo "❌ Ошибка применения миграции БД"
  exit 1
fi

# 2. Импортируем данные
echo ""
echo "📦 Импортируем данные проектов..."
node scripts/import-projects-data.js

if [ $? -eq 0 ]; then
  echo "✅ Данные успешно импортированы"
else
  echo "❌ Ошибка импорта данных"
  exit 1
fi

echo ""
echo "✅ Развертывание завершено успешно!"
echo ""
echo "📋 Что было сделано:"
echo "  - Созданы таблицы: projects_catalog, projects_items, projects_data"
echo "  - Добавлено 5 подблоков проектов"
echo "  - Добавлено 31 проект"
echo "  - Импортированы данные за сентябрь 2025"
echo ""
echo "🌐 Блок 'Проекты' доступен в дашборде по адресу:"
echo "   https://mvp-analitika-alex1976.amvera.io/dashboard"
