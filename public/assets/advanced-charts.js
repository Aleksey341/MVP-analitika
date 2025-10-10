/**
 * Advanced Chart Components
 * Расширенные компоненты визуализации для MVP-Analitika
 */

// ========================================
// 1. SPARKLINE CHART
// ========================================
class SparklineChart {
  constructor(canvas, data, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.data = data;
    this.options = {
      color: options.color || '#2563eb',
      lineWidth: options.lineWidth || 2,
      fillOpacity: options.fillOpacity || 0.2,
      showDots: options.showDots !== undefined ? options.showDots : false,
      ...options
    };
    this.render();
  }

  render() {
    const { ctx, canvas, data, options } = this;
    const width = canvas.width;
    const height = canvas.height;
    const padding = 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!data || data.length === 0) return;

    // Calculate min/max
    const values = data.map(d => typeof d === 'number' ? d : d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    // Calculate points
    const stepX = (width - padding * 2) / (values.length - 1 || 1);
    const points = values.map((val, i) => ({
      x: padding + i * stepX,
      y: height - padding - ((val - min) / range) * (height - padding * 2)
    }));

    // Draw filled area
    ctx.fillStyle = options.color + Math.floor(options.fillOpacity * 255).toString(16).padStart(2, '0');
    ctx.beginPath();
    ctx.moveTo(points[0].x, height);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, height);
    ctx.closePath();
    ctx.fill();

    // Draw line
    ctx.strokeStyle = options.color;
    ctx.lineWidth = options.lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Draw dots
    if (options.showDots) {
      ctx.fillStyle = options.color;
      points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
}

// ========================================
// 2. BULLET CHART (План vs Факт)
// ========================================
class BulletChart {
  constructor(canvas, data, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.data = data; // { plan, actual, min, max, ranges: [bad, ok, good] }
    this.options = {
      colors: {
        bad: '#ef4444',
        ok: '#f59e0b',
        good: '#10b981',
        actual: '#2563eb',
        plan: '#374151'
      },
      ...options
    };
    this.render();
  }

  render() {
    const { ctx, canvas, data, options } = this;
    const width = canvas.width;
    const height = canvas.height;
    const padding = { left: 10, right: 10, top: 5, bottom: 5 };

    ctx.clearRect(0, 0, width, height);

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barHeight = chartHeight * 0.6;
    const y = padding.top + (chartHeight - barHeight) / 2;

    const min = data.min || 0;
    const max = data.max || data.plan * 1.2;
    const range = max - min;

    // Helper to convert value to x position
    const valueToX = (val) => padding.left + ((val - min) / range) * chartWidth;

    // Draw background ranges
    if (data.ranges) {
      const rangeHeight = barHeight * 0.4;
      const rangeY = y + (barHeight - rangeHeight) / 2;

      // Bad range
      ctx.fillStyle = options.colors.bad + '30';
      ctx.fillRect(
        padding.left,
        rangeY,
        valueToX(data.ranges[0]) - padding.left,
        rangeHeight
      );

      // OK range
      ctx.fillStyle = options.colors.ok + '30';
      ctx.fillRect(
        valueToX(data.ranges[0]),
        rangeY,
        valueToX(data.ranges[1]) - valueToX(data.ranges[0]),
        rangeHeight
      );

      // Good range
      ctx.fillStyle = options.colors.good + '30';
      ctx.fillRect(
        valueToX(data.ranges[1]),
        rangeY,
        valueToX(max) - valueToX(data.ranges[1]),
        rangeHeight
      );
    }

    // Draw actual bar
    const actualWidth = valueToX(data.actual) - padding.left;
    const actualHeight = barHeight * 0.6;
    const actualY = y + (barHeight - actualHeight) / 2;

    ctx.fillStyle = options.colors.actual;
    ctx.fillRect(padding.left, actualY, actualWidth, actualHeight);

    // Draw plan marker
    const planX = valueToX(data.plan);
    ctx.strokeStyle = options.colors.plan;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(planX, y);
    ctx.lineTo(planX, y + barHeight);
    ctx.stroke();

    // Draw labels
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';

    // Actual value
    if (actualWidth > 30) {
      ctx.fillText(
        data.actual.toLocaleString(),
        padding.left + actualWidth / 2,
        actualY + actualHeight / 2 + 4
      );
    }

    // Plan value
    ctx.fillText(
      `План: ${data.plan.toLocaleString()}`,
      planX,
      y - 5
    );
  }
}

// ========================================
// 3. COMPARISON CHART (MoM, YoY)
// ========================================
function createComparisonChart(ctx, currentData, previousData, labels, options = {}) {
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: options.currentLabel || 'Текущий период',
          data: currentData,
          backgroundColor: '#2563eb',
          borderColor: '#2563eb',
          borderWidth: 1
        },
        {
          label: options.previousLabel || 'Предыдущий период',
          data: previousData,
          backgroundColor: '#9fb0c9',
          borderColor: '#9fb0c9',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: '#e8eef7' }
        },
        tooltip: {
          backgroundColor: '#1a1d24',
          titleColor: '#e8eef7',
          bodyColor: '#9fb0c9',
          borderColor: '#2b3444',
          borderWidth: 1,
          callbacks: {
            footer: function(items) {
              if (items.length >= 2) {
                const current = items[0].parsed.y;
                const previous = items[1].parsed.y;
                const change = previous !== 0
                  ? ((current - previous) / previous * 100).toFixed(1)
                  : 'N/A';
                return `Изменение: ${change}%`;
              }
              return '';
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#2b3444' },
          ticks: { color: '#9fb0c9' }
        },
        y: {
          grid: { color: '#2b3444' },
          ticks: { color: '#9fb0c9' },
          beginAtZero: true
        }
      }
    }
  });
}

// ========================================
// 4. RANKING WIDGET (Топ-3 / Худшие-3)
// ========================================
function createRankingWidget(container, data, options = {}) {
  // Sort data
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const top3 = sorted.slice(0, 3);
  const bottom3 = sorted.slice(-3).reverse();

  container.innerHTML = `
    <div class="ranking-container">
      <div class="ranking-section top">
        <h4 class="ranking-title">🏆 Топ-3</h4>
        ${top3.map((item, idx) => `
          <div class="ranking-item">
            <span class="rank rank-${idx + 1}">${idx + 1}</span>
            <span class="name">${item.name}</span>
            <span class="value">${item.value.toLocaleString()}</span>
            <div class="bar">
              <div class="bar-fill" style="width: ${(item.value / top3[0].value * 100)}%; background: ${getRankColor(idx)}"></div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="ranking-section bottom">
        <h4 class="ranking-title">⚠️ Требуют внимания</h4>
        ${bottom3.map((item, idx) => `
          <div class="ranking-item">
            <span class="rank rank-low">${sorted.length - idx}</span>
            <span class="name">${item.name}</span>
            <span class="value">${item.value.toLocaleString()}</span>
            <div class="bar">
              <div class="bar-fill" style="width: ${(item.value / top3[0].value * 100)}%; background: #ef4444"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function getRankColor(index) {
  const colors = ['#10b981', '#2563eb', '#8ab4ff'];
  return colors[index] || '#9fb0c9';
}

// ========================================
// 5. DRILL-DOWN HANDLER
// ========================================
class DrillDownManager {
  constructor() {
    this.stack = [];
    this.listeners = [];
  }

  push(level, data) {
    this.stack.push({ level, data });
    this.notify();
  }

  pop() {
    if (this.stack.length > 0) {
      this.stack.pop();
      this.notify();
    }
  }

  getCurrent() {
    return this.stack[this.stack.length - 1] || null;
  }

  onDrillDown(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.getCurrent()));
  }
}

// ========================================
// 6. CHART.JS PLUGINS
// ========================================

// Plugin: Brush Zooming
const brushZoomPlugin = {
  id: 'brushZoom',
  afterInit(chart, args, options) {
    chart.brushZoom = {
      enabled: options.enabled !== undefined ? options.enabled : true,
      selecting: false,
      start: null,
      end: null
    };
  },
  afterEvent(chart, args) {
    const { event } = args;
    const { brushZoom } = chart;

    if (!brushZoom.enabled) return;

    if (event.type === 'mousedown') {
      brushZoom.selecting = true;
      brushZoom.start = event.x;
    } else if (event.type === 'mousemove' && brushZoom.selecting) {
      brushZoom.end = event.x;
      chart.draw();
    } else if (event.type === 'mouseup' && brushZoom.selecting) {
      brushZoom.selecting = false;
      const startX = Math.min(brushZoom.start, event.x);
      const endX = Math.max(brushZoom.start, event.x);

      // Apply zoom
      if (Math.abs(endX - startX) > 10) {
        const xScale = chart.scales.x;
        const startValue = xScale.getValueForPixel(startX);
        const endValue = xScale.getValueForPixel(endX);

        chart.zoomScale('x', { min: startValue, max: endValue });
      }

      brushZoom.start = null;
      brushZoom.end = null;
      chart.draw();
    }
  },
  afterDatasetsDraw(chart, args, options) {
    const { brushZoom } = chart;

    if (brushZoom.selecting && brushZoom.start !== null && brushZoom.end !== null) {
      const ctx = chart.ctx;
      const startX = brushZoom.start;
      const endX = brushZoom.end;

      ctx.save();
      ctx.fillStyle = 'rgba(37, 99, 235, 0.1)';
      ctx.fillRect(
        Math.min(startX, endX),
        chart.chartArea.top,
        Math.abs(endX - startX),
        chart.chartArea.bottom - chart.chartArea.top
      );
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        Math.min(startX, endX),
        chart.chartArea.top,
        Math.abs(endX - startX),
        chart.chartArea.bottom - chart.chartArea.top
      );
      ctx.restore();
    }
  }
};

// Plugin: Synchronized Tooltips
const syncTooltipsPlugin = {
  id: 'syncTooltips',
  afterEvent(chart, args) {
    const { event } = args;

    if (event.type === 'mousemove') {
      const syncGroup = chart.options.plugins?.syncTooltips?.group;
      if (!syncGroup) return;

      // Broadcast to other charts in the same group
      window.dispatchEvent(new CustomEvent('chartTooltipSync', {
        detail: {
          group: syncGroup,
          sourceChart: chart.id,
          x: event.x,
          y: event.y
        }
      }));
    }
  }
};

// Plugin: Cross-filter
const crossFilterPlugin = {
  id: 'crossFilter',
  afterEvent(chart, args) {
    const { event } = args;

    if (event.type === 'click') {
      const elements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);

      if (elements.length > 0) {
        const element = elements[0];
        const datasetIndex = element.datasetIndex;
        const index = element.index;
        const value = chart.data.labels[index];

        // Dispatch filter event
        window.dispatchEvent(new CustomEvent('chartFilterApplied', {
          detail: {
            chart: chart.id,
            value: value,
            datasetIndex: datasetIndex,
            index: index
          }
        }));
      }
    }
  }
};

// Register plugins
if (typeof Chart !== 'undefined') {
  Chart.register(brushZoomPlugin, syncTooltipsPlugin, crossFilterPlugin);
}

// ========================================
// EXPORT
// ========================================
window.AdvancedCharts = {
  SparklineChart,
  BulletChart,
  createComparisonChart,
  createRankingWidget,
  DrillDownManager,
  plugins: {
    brushZoom: brushZoomPlugin,
    syncTooltips: syncTooltipsPlugin,
    crossFilter: crossFilterPlugin
  }
};
