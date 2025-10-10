/**
 * Dashboard Enhancements
 * UX/UI улучшения для MVP-Analitika Dashboard
 */

// ========================================
// 1. KPI INDICATORS (Цветовые индикаторы)
// ========================================

class KPIIndicator {
  static getStatus(value, thresholds) {
    // thresholds: { critical: 10, warning: 20, good: 30 }
    if (value <= thresholds.critical) return 'critical';
    if (value <= thresholds.warning) return 'warning';
    return 'good';
  }

  static getStatusColor(status) {
    const colors = {
      critical: '#ef4444',  // Красный
      warning: '#f59e0b',   // Оранжевый
      good: '#10b981'       // Зелёный
    };
    return colors[status] || '#6b7280';
  }

  static getStatusIcon(status) {
    const icons = {
      critical: '🔴',
      warning: '🟡',
      good: '🟢'
    };
    return icons[status] || '⚪';
  }

  static getStatusText(status) {
    const texts = {
      critical: 'Критично',
      warning: 'Требует внимания',
      good: 'В норме'
    };
    return texts[status] || 'Неизвестно';
  }

  static enhance(element, value, thresholds) {
    const status = this.getStatus(value, thresholds);
    const color = this.getStatusColor(status);
    const icon = this.getStatusIcon(status);
    const text = this.getStatusText(status);

    element.style.borderLeft = `4px solid ${color}`;

    const indicator = document.createElement('div');
    indicator.className = 'kpi-status-indicator';
    indicator.innerHTML = `
      <span class="kpi-status-icon">${icon}</span>
      <span class="kpi-status-text" style="color: ${color}">${text}</span>
    `;

    element.appendChild(indicator);
    return status;
  }
}

// ========================================
// 2. ANIMATED COUNTER (Анимация чисел)
// ========================================

class AnimatedCounter {
  static animate(element, start, end, duration = 1000) {
    const startTime = performance.now();
    const diff = end - start;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out-cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + diff * eased);

      element.textContent = current.toLocaleString('ru-RU');

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = end.toLocaleString('ru-RU');
      }
    }

    requestAnimationFrame(update);
  }

  static create(targetElement, finalValue, options = {}) {
    const {
      startValue = 0,
      duration = 1000,
      prefix = '',
      suffix = ''
    } = options;

    const tempSpan = document.createElement('span');
    tempSpan.textContent = startValue.toLocaleString('ru-RU');
    targetElement.innerHTML = prefix;
    targetElement.appendChild(tempSpan);
    targetElement.innerHTML += suffix;

    this.animate(tempSpan, startValue, finalValue, duration);
  }
}

// ========================================
// 3. URL FILTERS (Сохранение в URL)
// ========================================

class URLFilters {
  static save(filters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.set(key, value);
      }
    });

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ filters }, '', newUrl);
  }

  static load() {
    const params = new URLSearchParams(window.location.search);
    const filters = {};

    for (const [key, value] of params.entries()) {
      filters[key] = value;
    }

    return filters;
  }

  static clear() {
    window.history.pushState({}, '', window.location.pathname);
  }

  static onChange(callback) {
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.filters) {
        callback(event.state.filters);
      }
    });
  }
}

// ========================================
// 4. PRESET FILTERS (Быстрые фильтры)
// ========================================

class PresetFilters {
  static getPresets() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentQuarter = Math.ceil(currentMonth / 3);

    return {
      'current-month': {
        name: 'Текущий месяц',
        year: currentYear,
        month: currentMonth
      },
      'last-month': {
        name: 'Прошлый месяц',
        year: currentMonth === 1 ? currentYear - 1 : currentYear,
        month: currentMonth === 1 ? 12 : currentMonth - 1
      },
      'current-quarter': {
        name: 'Текущий квартал',
        year: currentYear,
        quarter: currentQuarter,
        months: this.getQuarterMonths(currentQuarter)
      },
      'last-quarter': {
        name: 'Прошлый квартал',
        ...this.getPreviousQuarter(currentYear, currentQuarter)
      },
      'half-year': {
        name: 'Последние 6 месяцев',
        year: currentYear,
        months: this.getLastNMonths(6)
      },
      'current-year': {
        name: 'Текущий год',
        year: currentYear
      },
      'last-year': {
        name: 'Прошлый год',
        year: currentYear - 1
      }
    };
  }

  static getQuarterMonths(quarter) {
    const quarters = {
      1: [1, 2, 3],
      2: [4, 5, 6],
      3: [7, 8, 9],
      4: [10, 11, 12]
    };
    return quarters[quarter];
  }

  static getPreviousQuarter(year, currentQuarter) {
    if (currentQuarter === 1) {
      return {
        year: year - 1,
        quarter: 4,
        months: [10, 11, 12]
      };
    }
    return {
      year: year,
      quarter: currentQuarter - 1,
      months: this.getQuarterMonths(currentQuarter - 1)
    };
  }

  static getLastNMonths(n) {
    const now = new Date();
    const months = [];

    for (let i = 0; i < n; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.unshift(date.getMonth() + 1);
    }

    return months;
  }

  static renderPresets(containerSelector, onSelect) {
    const container = document.querySelector(containerSelector);
    const presets = this.getPresets();

    container.innerHTML = `
      <div class="preset-filters">
        <label class="preset-label">Быстрые фильтры:</label>
        <div class="preset-buttons">
          ${Object.entries(presets).map(([key, preset]) => `
            <button class="preset-btn" data-preset="${key}">
              ${preset.name}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const presetKey = btn.dataset.preset;
        const preset = presets[presetKey];

        // Highlight active button
        container.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        onSelect(preset);
      });
    });
  }
}

// ========================================
// 5. AUTO INSIGHTS (Автоматические инсайты)
// ========================================

class InsightsEngine {
  static analyze(data) {
    const insights = [];

    // 1. Тренд (рост/падение)
    if (data.current && data.previous) {
      const change = ((data.current - data.previous) / data.previous * 100).toFixed(1);
      const direction = change > 0 ? 'выросли' : 'снизились';
      const icon = change > 0 ? '📈' : '📉';

      if (Math.abs(change) > 10) {
        insights.push({
          type: Math.abs(change) > 30 ? 'critical' : 'info',
          icon: icon,
          title: `Значительное изменение`,
          text: `Показатели ${direction} на ${Math.abs(change)}% по сравнению с предыдущим периодом`
        });
      }
    }

    // 2. Аномалии (выбросы)
    if (data.timeseries && data.timeseries.length > 0) {
      const values = data.timeseries.map(d => d.value);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / values.length);

      data.timeseries.forEach((point, idx) => {
        const zScore = Math.abs((point.value - avg) / stdDev);
        if (zScore > 2) {
          insights.push({
            type: 'warning',
            icon: '⚠️',
            title: `Обнаружена аномалия`,
            text: `В ${point.label} зафиксировано необычно ${point.value > avg ? 'высокое' : 'низкое'} значение: ${point.value}`
          });
        }
      });
    }

    // 3. Сезонность
    if (data.timeseries && data.timeseries.length >= 12) {
      const monthlyAvg = {};
      data.timeseries.forEach((point, idx) => {
        const month = idx % 12;
        if (!monthlyAvg[month]) monthlyAvg[month] = [];
        monthlyAvg[month].push(point.value);
      });

      // Найти месяц с максимальным средним
      let maxMonth = 0;
      let maxAvg = 0;
      Object.entries(monthlyAvg).forEach(([month, values]) => {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        if (avg > maxAvg) {
          maxAvg = avg;
          maxMonth = parseInt(month);
        }
      });

      const monthNames = ['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне',
                         'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'];

      insights.push({
        type: 'info',
        icon: '📅',
        title: `Сезонный паттерн`,
        text: `Наибольшее количество инцидентов наблюдается в ${monthNames[maxMonth]}`
      });
    }

    // 4. Топ и худшие
    if (data.rankings && data.rankings.length > 0) {
      const top = data.rankings[0];
      const worst = data.rankings[data.rankings.length - 1];

      insights.push({
        type: 'success',
        icon: '🏆',
        title: `Лидер`,
        text: `${top.name} показывает лучшие результаты: ${top.value}`
      });

      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: `Требует внимания`,
        text: `${worst.name} нуждается в улучшении показателей: ${worst.value}`
      });
    }

    return insights;
  }

  static render(insights, containerSelector) {
    const container = document.querySelector(containerSelector);

    container.innerHTML = `
      <div class="insights-container">
        ${insights.map(insight => `
          <div class="insight-card insight-${insight.type}">
            <div class="insight-icon">${insight.icon}</div>
            <div class="insight-content">
              <h4 class="insight-title">${insight.title}</h4>
              <p class="insight-text">${insight.text}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
}

// ========================================
// 6. PDF EXPORT
// ========================================

class PDFExporter {
  static async export(options = {}) {
    const {
      filename = 'dashboard-report.pdf',
      title = 'Отчёт по дашборду',
      includeCharts = true
    } = options;

    // Используем html2pdf.js (нужно подключить библиотеку)
    if (typeof html2pdf === 'undefined') {
      console.error('html2pdf library not loaded');
      alert('Для экспорта в PDF необходима библиотека html2pdf.js');
      return;
    }

    const element = document.createElement('div');
    element.style.padding = '20px';
    element.innerHTML = `
      <h1>${title}</h1>
      <p>Дата создания: ${new Date().toLocaleDateString('ru-RU')}</p>
      <hr>
    `;

    // Копируем основной контент
    const mainContent = document.querySelector('main').cloneNode(true);

    // Удаляем интерактивные элементы
    mainContent.querySelectorAll('button, select, input').forEach(el => el.remove());

    element.appendChild(mainContent);

    const opt = {
      margin: 10,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  }

  static addExportButton(containerSelector) {
    const container = document.querySelector(containerSelector);
    const btn = document.createElement('button');
    btn.className = 'btn-export-pdf';
    btn.innerHTML = '📄 Экспорт в PDF';
    btn.onclick = () => this.export();
    container.appendChild(btn);
  }
}

// ========================================
// 7. ONBOARDING TOUR
// ========================================

class OnboardingTour {
  constructor(steps) {
    this.steps = steps;
    this.currentStep = 0;
    this.overlay = null;
    this.tooltip = null;
  }

  start() {
    // Проверяем, проходил ли пользователь тур
    if (localStorage.getItem('tour_completed') === 'true') {
      return;
    }

    this.createOverlay();
    this.showStep(0);
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'tour-overlay';
    document.body.appendChild(this.overlay);

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tour-tooltip';
    document.body.appendChild(this.tooltip);
  }

  showStep(index) {
    if (index >= this.steps.length) {
      this.complete();
      return;
    }

    this.currentStep = index;
    const step = this.steps[index];

    // Highlight элемент
    const element = document.querySelector(step.selector);
    if (!element) {
      this.showStep(index + 1);
      return;
    }

    element.classList.add('tour-highlight');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Позиционируем tooltip
    const rect = element.getBoundingClientRect();
    this.tooltip.innerHTML = `
      <div class="tour-content">
        <h3>${step.title}</h3>
        <p>${step.text}</p>
        <div class="tour-controls">
          <button class="tour-btn-skip" onclick="window.tour.skip()">Пропустить</button>
          <div class="tour-progress">${index + 1} / ${this.steps.length}</div>
          <button class="tour-btn-next" onclick="window.tour.next()">
            ${index === this.steps.length - 1 ? 'Завершить' : 'Далее →'}
          </button>
        </div>
      </div>
    `;

    this.tooltip.style.top = `${rect.bottom + 20}px`;
    this.tooltip.style.left = `${rect.left}px`;
    this.tooltip.classList.add('active');
  }

  next() {
    // Убираем highlight с текущего элемента
    const currentElement = document.querySelector(this.steps[this.currentStep].selector);
    if (currentElement) {
      currentElement.classList.remove('tour-highlight');
    }

    this.showStep(this.currentStep + 1);
  }

  skip() {
    this.complete();
  }

  complete() {
    localStorage.setItem('tour_completed', 'true');

    if (this.overlay) this.overlay.remove();
    if (this.tooltip) this.tooltip.remove();

    // Убираем все highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });
  }
}

// ========================================
// EXPORT
// ========================================

window.DashboardEnhancements = {
  KPIIndicator,
  AnimatedCounter,
  URLFilters,
  PresetFilters,
  InsightsEngine,
  PDFExporter,
  OnboardingTour
};
