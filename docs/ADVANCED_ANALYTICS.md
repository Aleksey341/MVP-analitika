# Расширенная аналитика - Документация

## 📊 Обзор

Модуль расширенной аналитики добавляет мощные инструменты визуализации и сравнительного анализа для MVP-Analitika.

## 🚀 Быстрый старт

### 1. Подключение библиотеки

```html
<!-- CSS -->
<link rel="stylesheet" href="/assets/advanced-charts.css" />

<!-- JavaScript -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="/assets/advanced-charts.js"></script>
```

### 2. Доступ к демо-странице

Откройте `/dashboard-enhanced.html` для просмотра всех компонентов в действии.

## 📈 Компоненты

### 1. Sparkline Charts (Мини-графики в KPI)

**Использование:**

```javascript
const canvas = document.getElementById('sparkline');
new AdvancedCharts.SparklineChart(canvas, [100, 120, 110, 150, 145], {
  color: '#2563eb',
  lineWidth: 2,
  fillOpacity: 0.2,
  showDots: false
});
```

**Параметры:**
- `color` (string) - цвет линии
- `lineWidth` (number) - толщина линии
- `fillOpacity` (number) - прозрачность заливки (0-1)
- `showDots` (boolean) - показывать точки на графике

**Пример HTML:**

```html
<div class="kpi-card">
  <div class="kpi-label">Услуги</div>
  <div class="kpi-value">145,832</div>
  <div class="kpi-sparkline">
    <canvas id="sparkline-services" width="200" height="40"></canvas>
  </div>
</div>
```

---

### 2. Bullet Chart (План vs Факт)

**Использование:**

```javascript
const canvas = document.getElementById('bullet-chart');
new AdvancedCharts.BulletChart(canvas, {
  plan: 150000,      // Плановое значение
  actual: 145832,    // Фактическое значение
  min: 0,            // Минимум шкалы
  max: 180000,       // Максимум шкалы
  ranges: [100000, 140000, 180000]  // Зоны: плохо, норма, хорошо
});
```

**Интерпретация:**
- Синий столбец = фактическое значение
- Вертикальная линия = плановое значение
- Цветные зоны фона = оценка результата (красный/желтый/зеленый)

**Пример:**

```html
<div class="bullet-chart-container">
  <div class="bullet-chart-label">
    <span>Выполнение плана</span>
    <span>145,832 / 150,000</span>
  </div>
  <canvas id="bullet-chart-1" width="600" height="60"></canvas>
</div>
```

---

### 3. Comparison Chart (Сравнительный анализ MoM/YoY)

**API Endpoint:**

```
GET /api/services-dashboard/comparison
```

**Параметры:**
- `year` (required) - год для сравнения
- `month` (optional) - месяц (для MoM)
- `municipality_id` (optional) - ID муниципалитета
- `comparison_type` - тип сравнения:
  - `yoy` (Year-over-Year) - год к году
  - `mom` (Month-over-Month) - месяц к месяцу

**Пример запроса:**

```javascript
const response = await fetch(
  '/api/services-dashboard/comparison?year=2025&comparison_type=yoy'
);
const data = await response.json();
```

**Ответ:**

```json
{
  "comparison_type": "yoy",
  "current_period": {
    "year": 2025,
    "month": null,
    "total": 145832,
    "monthly": [
      { "month": 1, "total": 12000 },
      { "month": 2, "total": 12500 },
      ...
    ]
  },
  "previous_period": {
    "year": 2024,
    "month": null,
    "total": 130000,
    "monthly": [...]
  },
  "change_percent": "12.2"
}
```

**Использование:**

```javascript
const ctx = document.getElementById('comparison-chart').getContext('2d');

const chart = AdvancedCharts.createComparisonChart(
  ctx,
  data.current_period.monthly.map(d => d.total),
  data.previous_period.monthly.map(d => d.total),
  ['Янв', 'Фев', 'Мар', ...],
  {
    currentLabel: '2025 год',
    previousLabel: '2024 год'
  }
);
```

---

### 4. Ranking Widget (Топ-3 / Худшие-3)

**API Endpoint:**

```
GET /api/services-dashboard/ranking
```

**Параметры:**
- `year` (required) - год
- `month` (optional) - месяц

**Ответ:**

```json
{
  "total_municipalities": 18,
  "top_performers": [
    {
      "rank": 1,
      "id": 5,
      "name": "Липецк",
      "total": 45000,
      "service_count": 150,
      "avg_per_service": 300
    },
    ...
  ],
  "need_attention": [...],
  "all_rankings": [...]
}
```

**Использование:**

```javascript
const response = await fetch('/api/services-dashboard/ranking?year=2025');
const data = await response.json();

const container = document.getElementById('ranking-widget');
const rankingData = data.all_rankings.map(r => ({
  name: r.name,
  value: r.total
}));

AdvancedCharts.createRankingWidget(container, rankingData);
```

**HTML разметка создается автоматически:**

```html
<div id="ranking-widget"></div>
```

---

### 5. Drill-Down Manager (Детализация по клику)

**Использование:**

```javascript
const drillDownManager = new AdvancedCharts.DrillDownManager();

// Слушать изменения
drillDownManager.onDrillDown((level) => {
  if (level) {
    console.log('Текущий уровень:', level.level);
    console.log('Данные:', level.data);
  }
});

// Переход на следующий уровень
chart.onClick = (event, elements) => {
  if (elements.length > 0) {
    const municipalityId = elements[0].index;
    drillDownManager.push('municipality', { id: municipalityId });

    // Загрузить детальные данные
    loadDistrictData(municipalityId);
  }
};

// Возврат назад
drillDownManager.pop();
```

**Пример с breadcrumb:**

```html
<div class="drilldown-breadcrumb">
  <span class="breadcrumb-item" onclick="drillDown.reset()">Все</span>
  <span class="breadcrumb-separator">›</span>
  <span class="breadcrumb-item active">Липецк</span>
</div>
```

---

### 6. Brush Zooming (Масштабирование графиков)

Автоматически активируется через плагин Chart.js.

**Использование:**

```javascript
const chart = new Chart(ctx, {
  type: 'line',
  data: {...},
  options: {
    plugins: {
      brushZoom: {
        enabled: true  // Включить brush zooming
      }
    }
  }
});
```

**Как использовать:**
1. Зажмите левую кнопку мыши на графике
2. Выделите область для масштабирования
3. Отпустите кнопку - график увеличится

**Сброс зума:**

```javascript
chart.resetZoom();
```

---

### 7. Synchronized Tooltips (Синхронизация подсказок)

Позволяет связать несколько графиков так, чтобы при наведении на один автоматически показывались tooltips на других.

**Использование:**

```javascript
const chart1 = new Chart(ctx1, {
  type: 'line',
  data: {...},
  options: {
    plugins: {
      syncTooltips: {
        group: 'sync-group-1'  // Идентификатор группы
      }
    }
  }
});

const chart2 = new Chart(ctx2, {
  type: 'bar',
  data: {...},
  options: {
    plugins: {
      syncTooltips: {
        group: 'sync-group-1'  // Та же группа
      }
    }
  }
});
```

Теперь при наведении на один график tooltip появится на обоих.

---

### 8. Cross-Filter (Кросс-фильтрация)

Позволяет кликнуть на элемент одного графика и отфильтровать другие графики.

**Использование:**

```javascript
const chart = new Chart(ctx, {
  type: 'bar',
  data: {...},
  options: {
    plugins: {
      crossFilter: { enabled: true }
    }
  }
});

// Слушать события фильтрации
window.addEventListener('chartFilterApplied', (event) => {
  const { value, datasetIndex, index } = event.detail;

  // Обновить другие графики
  updateOtherCharts(value);
});
```

---

## 🎨 Стилизация

### CSS переменные

Все компоненты используют CSS-переменные из основной темы:

```css
:root {
  --bg-primary: #0f1115;
  --bg-secondary: #1a1d24;
  --bg-tertiary: #232a36;
  --border: #2b3444;
  --text-primary: #e8eef7;
  --text-secondary: #9fb0c9;
  --accent-blue: #2563eb;
  --success: #10b981;
  --danger: #ef4444;
  --warning: #f59e0b;
}
```

### Кастомизация компонентов

Вы можете переопределить стили:

```css
.kpi-card {
  /* Ваши стили */
}

.ranking-item {
  /* Ваши стили */
}
```

---

## 🔧 Расширение функциональности

### Добавление нового типа графика

1. Создайте класс в `advanced-charts.js`:

```javascript
class MyCustomChart {
  constructor(canvas, data, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.data = data;
    this.options = options;
    this.render();
  }

  render() {
    // Ваша логика отрисовки
  }
}

// Экспорт
window.AdvancedCharts.MyCustomChart = MyCustomChart;
```

2. Добавьте стили в `advanced-charts.css`:

```css
.my-custom-chart {
  /* Стили */
}
```

3. Используйте:

```javascript
new AdvancedCharts.MyCustomChart(canvas, data, options);
```

---

## 📊 Примеры использования

### Полный пример: Сравнение с переключением MoM/YoY

```html
<div class="comparison-section">
  <div class="comparison-header">
    <h3>Сравнительный анализ</h3>
    <div class="comparison-toggle">
      <button class="active" data-type="yoy">YoY</button>
      <button data-type="mom">MoM</button>
    </div>
  </div>
  <div class="comparison-chart-wrapper">
    <canvas id="comparison-chart"></canvas>
  </div>
</div>

<script>
let comparisonType = 'yoy';
let comparisonChart;

async function loadComparison(type) {
  const response = await fetch(
    `/api/services-dashboard/comparison?year=2025&comparison_type=${type}`
  );
  const data = await response.json();

  if (comparisonChart) comparisonChart.destroy();

  const ctx = document.getElementById('comparison-chart').getContext('2d');
  comparisonChart = AdvancedCharts.createComparisonChart(
    ctx,
    data.current_period.monthly.map(d => d.total),
    data.previous_period.monthly.map(d => d.total),
    ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
    {
      currentLabel: `${data.current_period.year}`,
      previousLabel: `${data.previous_period.year}`
    }
  );
}

document.querySelectorAll('.comparison-toggle button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.comparison-toggle button')
      .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadComparison(btn.dataset.type);
  });
});

loadComparison('yoy');
</script>
```

---

## 🐛 Troubleshooting

### График не отображается

1. Убедитесь, что Chart.js загружен:
```javascript
console.log(typeof Chart); // должно быть 'function'
```

2. Проверьте консоль на ошибки

3. Убедитесь, что canvas имеет размеры:
```css
canvas {
  width: 100%;
  height: 400px;
}
```

### Sparkline отображается неправильно

Установите явные размеры canvas:

```html
<canvas id="sparkline" width="200" height="40"></canvas>
```

### API возвращает пустые данные

Проверьте:
1. Есть ли данные в БД
2. Правильно ли переданы параметры year/month
3. Логи сервера: `console.log('[Services] Query results:', rows)`

---

## 🚀 Roadmap

### Планируемые компоненты:

- ✅ Sparklines
- ✅ Bullet Charts
- ✅ Comparison Charts (MoM/YoY)
- ✅ Ranking Widget
- ✅ Drill-Down
- ✅ Brush Zooming
- ✅ Sync Tooltips
- ✅ Cross-Filter
- ⏳ Sankey Diagram (финансовые потоки)
- ⏳ Treemap (структура бюджета)
- ⏳ Geographic Heatmap (карта ДТП)
- ⏳ Predictive Analytics (прогнозы)
- ⏳ Anomaly Detection (обнаружение аномалий)

---

## 📝 Лицензия

Часть проекта MVP-Analitika

## 🤝 Вклад

При добавлении новых компонентов:

1. Документируйте API
2. Добавьте примеры использования
3. Обновите `dashboard-enhanced.html`
4. Протестируйте на разных разрешениях

---

**Версия:** 1.0.0
**Дата:** 2025-01-10
