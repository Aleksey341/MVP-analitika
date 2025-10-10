## 🎨 UX/UI Улучшения - Документация

### 📦 Установка

```html
<!-- CSS -->
<link rel="stylesheet" href="/assets/dashboard-enhancements.css" />

<!-- JavaScript -->
<script src="/assets/dashboard-enhancements.js"></script>

<!-- Для PDF экспорта -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
```

### 🚀 Быстрый старт

Демо-страница: `/dashboard-demo.html`

---

## 📚 Компоненты

### 1. 🎯 KPI Indicators (Цветовые индикаторы)

Автоматическое окрашивание карточек показателей по критичности.

**Использование:**

```javascript
const { KPIIndicator } = window.DashboardEnhancements;

const card = document.querySelector('.kpi-card');
const value = 234;
const thresholds = {
  critical: 300,  // Критично если <= 300
  warning: 250,   // Внимание если <= 250
  good: 200       // Норма если <= 200
};

const status = KPIIndicator.enhance(card, value, thresholds);
// Возвращает: 'critical', 'warning', 'good'
```

**Результат:**
- Цветная полоса слева от карточки
- Индикатор статуса (🔴/🟡/🟢)
- Текст статуса ("Критично" / "Требует внимания" / "В норме")

---

### 2. ✨ Animated Counter (Анимированные счётчики)

Плавная анимация изменения чисел.

**Использование:**

```javascript
const { AnimatedCounter } = window.DashboardEnhancements;

const element = document.getElementById('counter');
const startValue = 0;
const endValue = 12458;

AnimatedCounter.animate(element, startValue, endValue, 1000);
```

**Или с префиксом/суффиксом:**

```javascript
AnimatedCounter.create(element, 12458, {
  startValue: 0,
  duration: 1500,
  prefix: '₽ ',
  suffix: ' млн'
});
```

---

### 3. 🔗 URL Filters (Сохранение в URL)

Сохранение фильтров в URL для возможности шаринга ссылок.

**Сохранение:**

```javascript
const { URLFilters } = window.DashboardEnhancements;

URLFilters.save({
  year: 2025,
  month: 5,
  municipality: 'lipetsk'
});

// URL станет: /dashboard?year=2025&month=5&municipality=lipetsk
```

**Загрузка:**

```javascript
const filters = URLFilters.load();
// { year: '2025', month: '5', municipality: 'lipetsk' }

// Применяем фильтры
applyFilters(filters);
```

**Отслеживание изменений (кнопка "Назад"):**

```javascript
URLFilters.onChange((filters) => {
  console.log('Пользователь вернулся назад:', filters);
  applyFilters(filters);
});
```

---

### 4. 🎯 Preset Filters (Быстрые фильтры)

Предустановленные фильтры для быстрого выбора периодов.

**Рендеринг:**

```javascript
const { PresetFilters } = window.DashboardEnhancements;

PresetFilters.renderPresets('#container', (preset) => {
  console.log('Выбран:', preset);

  // preset = {
  //   name: 'Текущий квартал',
  //   year: 2025,
  //   quarter: 2,
  //   months: [4, 5, 6]
  // }

  // Применяем фильтр
  loadDashboard({ year: preset.year, months: preset.months });
});
```

**Доступные presets:**
- `current-month` - Текущий месяц
- `last-month` - Прошлый месяц
- `current-quarter` - Текущий квартал
- `last-quarter` - Прошлый квартал
- `half-year` - Последние 6 месяцев
- `current-year` - Текущий год
- `last-year` - Прошлый год

**HTML (создаётся автоматически):**

```html
<div id="preset-filters"></div>

<script>
PresetFilters.renderPresets('#preset-filters', (preset) => {
  // Обработка
});
</script>
```

---

### 5. 💡 Insights Engine (Автоматические инсайты)

Автоматический анализ данных и генерация инсайтов.

**Использование:**

```javascript
const { InsightsEngine } = window.DashboardEnhancements;

const data = {
  // Сравнение текущего и предыдущего периода
  current: 234,
  previous: 280,

  // Временной ряд для поиска аномалий
  timeseries: [
    { label: 'Янв', value: 220 },
    { label: 'Фев', value: 215 },
    { label: 'Мар', value: 350 },  // Аномалия!
    ...
  ],

  // Рейтинг для выявления лучших/худших
  rankings: [
    { name: 'Липецк', value: 89 },
    { name: 'Елец', value: 45 },
    ...
  ]
};

const insights = InsightsEngine.analyze(data);
InsightsEngine.render(insights, '#insights-container');
```

**Генерируемые инсайты:**
1. **Тренд** - рост/падение показателей
2. **Аномалии** - необычные выбросы
3. **Сезонность** - паттерны по месяцам
4. **Лидеры и аутсайдеры**

**Структура инсайта:**

```javascript
{
  type: 'critical' | 'warning' | 'success' | 'info',
  icon: '📈',
  title: 'Значительное изменение',
  text: 'Показатели выросли на 25% по сравнению с предыдущим периодом'
}
```

---

### 6. 📄 PDF Exporter (Экспорт в PDF)

Экспорт дашборда в PDF файл.

**Простое использование:**

```javascript
const { PDFExporter } = window.DashboardEnhancements;

// Добавить кнопку экспорта
PDFExporter.addExportButton('#header-container');
```

**Кастомный экспорт:**

```javascript
PDFExporter.export({
  filename: 'report-may-2025.pdf',
  title: 'Отчёт по ДТП за май 2025',
  includeCharts: true
});
```

**Требования:**
- Подключите библиотеку `html2pdf.js`:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
```

---

### 7. 🎓 Onboarding Tour (Обучающий тур)

Интерактивный тур для новых пользователей.

**Создание тура:**

```javascript
const { OnboardingTour } = window.DashboardEnhancements;

const tour = new OnboardingTour([
  {
    selector: '#filters',
    title: 'Фильтры',
    text: 'Здесь вы можете выбрать период для отчёта'
  },
  {
    selector: '.kpi-grid',
    title: 'Ключевые показатели',
    text: 'Карточки показывают основные метрики'
  },
  {
    selector: '#chart',
    title: 'Динамика',
    text: 'График показывает изменения по месяцам'
  }
]);

window.tour = tour;  // Для доступа из onclick
tour.start();
```

**Управление:**
- Тур автоматически пропускается, если пользователь уже проходил его
- Хранение в `localStorage.getItem('tour_completed')`
- Кнопки: "Пропустить" / "Далее" / "Завершить"
- Поддержка кнопки "Назад" в браузере

**Сброс тура (для тестирования):**

```javascript
localStorage.removeItem('tour_completed');
location.reload();
```

---

## 🎨 Стилизация

### Цветовые индикаторы

```css
/* Критичные KPI */
.kpi-card[data-status="critical"] {
  border-left: 4px solid #ef4444;
  animation: pulse-critical 2s ease-in-out infinite;
}

/* Внимание */
.kpi-card[data-status="warning"] {
  border-left: 4px solid #f59e0b;
}

/* Норма */
.kpi-card[data-status="good"] {
  border-left: 4px solid #10b981;
}
```

### Инсайты

```css
.insight-card.insight-critical {
  border-left-color: #ef4444;
}

.insight-card.insight-warning {
  border-left-color: #f59e0b;
}

.insight-card.insight-success {
  border-left-color: #10b981;
}

.insight-card.insight-info {
  border-left-color: #3b82f6;
}
```

---

## 📱 Мобильная адаптация

Все компоненты адаптивны:

- **KPI карточки** - swipeable горизонтальная прокрутка
- **Preset фильтры** - вертикальная раскладка
- **Инсайты** - одна колонка
- **Тур** - адаптивный tooltip

```css
@media (max-width: 768px) {
  .kpi-grid {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
  }

  .kpi-card {
    min-width: 280px;
    scroll-snap-align: start;
  }
}
```

---

## ♿ Доступность

### Встроенная поддержка:

1. **Клавиатурная навигация** - все интерактивные элементы доступны с клавиатуры
2. **Focus states** - видимые индикаторы фокуса
3. **Высокий контраст** - улучшенная читаемость в тёмной теме
4. **prefers-reduced-motion** - уважение к настройкам пользователя
5. **ARIA labels** - семантическая разметка

```css
/* Автоматически отключает анимации */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 🔧 Интеграция в существующий дашборд

### Шаг 1: Подключение

```html
<head>
  <link rel="stylesheet" href="/assets/dashboard-enhancements.css" />
</head>
<body>
  <!-- Ваш контент -->

  <script src="/assets/dashboard-enhancements.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
</body>
```

### Шаг 2: Добавление компонентов

```javascript
// Деструктуризация
const {
  KPIIndicator,
  AnimatedCounter,
  URLFilters,
  PresetFilters,
  InsightsEngine,
  PDFExporter,
  OnboardingTour
} = window.DashboardEnhancements;

// Preset фильтры
PresetFilters.renderPresets('#filters', applyFilters);

// URL persistence
URLFilters.onChange(applyFilters);
const savedFilters = URLFilters.load();
if (savedFilters.year) {
  applyFilters(savedFilters);
}

// KPI индикаторы
document.querySelectorAll('.kpi-card').forEach((card, idx) => {
  const value = parseInt(card.querySelector('.kpi-value').textContent);
  KPIIndicator.enhance(card, value, thresholds[idx]);
});

// Автоматические инсайты
const insights = InsightsEngine.analyze(dashboardData);
InsightsEngine.render(insights, '#insights');

// PDF экспорт
PDFExporter.addExportButton('#header');

// Onboarding
const tour = new OnboardingTour(tourSteps);
window.tour = tour;
if (!localStorage.getItem('tour_completed')) {
  tour.start();
}
```

---

## 📊 Примеры

### Полный пример с фильтрами

```javascript
// Восстановление из URL
const filters = URLFilters.load();
if (filters.year) {
  document.getElementById('year').value = filters.year;
  if (filters.month) {
    document.getElementById('month').value = filters.month;
  }
  loadDashboard(filters);
}

// Preset фильтры
PresetFilters.renderPresets('#presets', (preset) => {
  // Сохраняем в URL
  URLFilters.save({ year: preset.year, month: preset.month });

  // Обновляем UI
  document.getElementById('year').value = preset.year;
  if (preset.month) {
    document.getElementById('month').value = preset.month;
  }

  // Загружаем данные
  loadDashboard(preset);
});

// Обработка изменения фильтров
document.getElementById('year').addEventListener('change', (e) => {
  const year = e.target.value;
  URLFilters.save({ year });
  loadDashboard({ year });
});
```

---

## 🐛 Troubleshooting

### Тур не запускается

```javascript
// Проверьте, что селекторы правильные
const tour = new OnboardingTour([
  {
    selector: '#existing-element',  // ✅ Элемент существует
    title: 'Title',
    text: 'Text'
  }
]);

// Если элемент не найден, шаг пропускается автоматически
```

### PDF экспорт не работает

```javascript
// Убедитесь, что библиотека загружена
if (typeof html2pdf === 'undefined') {
  console.error('html2pdf not loaded!');
}
```

### Инсайты не генерируются

```javascript
// Проверьте формат данных
const data = {
  current: 234,           // ✅ Число
  previous: 280,          // ✅ Число
  timeseries: [...],      // ✅ Массив объектов { label, value }
  rankings: [...]         // ✅ Массив объектов { name, value }
};

const insights = InsightsEngine.analyze(data);
console.log('Сгенерировано инсайтов:', insights.length);
```

---

## 📝 Changelog

**v1.0.0** (2025-01-10)
- ✅ KPI Indicators
- ✅ Animated Counters
- ✅ URL Filters
- ✅ Preset Filters
- ✅ Insights Engine
- ✅ PDF Exporter
- ✅ Onboarding Tour
- ✅ Mobile optimization
- ✅ Accessibility improvements

---

**Версия:** 1.0.0
**Дата:** 2025-01-10
