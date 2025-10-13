// scripts/import-projects-data.js
// Скрипт для импорта данных проектов из Excel в БД

'use strict';

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Данные из Excel файла (сентябрь 2025)
const projectsData = {
  // МЖКХ
  mjkh: [
    {
      name: 'Переселение из АЖФ',
      dynamic_text: '0,8 тыс. кв. м',
      dynamic_value: 0.8,
      plan_text: '2025 - 0,48 тыс.кв.м.\n2026 - 2,0 тыс.кв.м.'
    },
    {
      name: 'Сертификаты (дети-сироты)',
      dynamic_text: '. Заявлений: 35 шт.\n. Выдано: 33 шт.\n. Оплачено: 19 сертификатов на сумму 67,61 млн руб. (57,46%)',
      dynamic_value: 57.46,
      plan_text: '32 шт. на сумму 117,7 млн руб.'
    },
    {
      name: 'Закупка квартир для детей-сирот',
      dynamic_text: '. Факт: 312 шт. (90%)\n. На стадии заключения: 11 шт.\n. Касса: 559,8 млн руб. (45%)',
      dynamic_value: 90,
      plan_text: '348 кв. на сумму 1 255,2 млн руб.'
    },
    {
      name: 'ФП «ФКГС» ФБ',
      dynamic_text: 'Касса: 183,4 млн руб. (62%)',
      dynamic_value: 62,
      plan_text: '297,12 млн. руб. \n65 ед.'
    },
    {
      name: 'ФП «ФКГС» ОБ',
      dynamic_text: '. Касса: 351 млн руб. (89%)\n. 211,5 млн руб. (54%)',
      dynamic_value: 89,
      plan_text: '394,2 млн. руб'
    },
    {
      name: 'Конкурс МГ и ИП ФБ',
      dynamic_text: 'Касса: 107 млн руб. (52%)',
      dynamic_value: 52,
      plan_text: '3  ед. /206,3 млн. руб.'
    },
    {
      name: 'ФП «МКИ»',
      dynamic_text: '. Контрактование: 9 ед. (100%) / 305,1 млн руб. (79,5%)\n. Экономия: 78,5 млн руб.\n. Касса: 119,7 млн руб. (31%)',
      dynamic_value: 100,
      plan_text: '9 ед. / 383,6 млн. руб'
    },
    {
      name: 'ФНБ',
      dynamic_text: '. Касса: 177,4 млн руб. (14,4%)\n. Готовность: 20,11% (+0,1%)',
      dynamic_value: 20.11,
      plan_text: '1 ед. / 1231,1 млн. руб'
    },
    {
      name: 'Строительство объектов ВС и ВО',
      dynamic_text: '. Контрактование: 113 ед. (86,9%) / 518,3 млн руб. (94,3%)\n. Касса: 124,5 млн руб. (22,7%)',
      dynamic_value: 86.9,
      plan_text: '130 ед. / 549,5 млн. руб'
    },
    {
      name: 'СКК',
      dynamic_text: 'Касса: 158,5 млн руб. (76,1%)\nГотовность: 75% (+11%)',
      dynamic_value: 75,
      plan_text: '2 ед. / 208,3 млн. руб.'
    },
    {
      name: 'Госдолг',
      dynamic_text: '. Контрактование: 12 ед. (75%) / 499,5 млн руб. (58,5%)\n. Касса: 92,6 млн руб. (10,8%)',
      dynamic_value: 75,
      plan_text: '16 ед . / 853,2 млн. руб.'
    }
  ],
  // МСиА
  msia: [
    {
      name: 'Ввод жилья',
      dynamic_text: '37,9% (+5,9%)',
      dynamic_value: 37.9,
      plan_text: '880,0 тыс. М²'
    },
    {
      name: 'Разработка градостроительной документации',
      dynamic_value: 41,
      plan_text: '4 160 млн.'
    },
    {
      name: 'Касса по объектам ОКУ УКС',
      dynamic_text: '40%',
      dynamic_value: 40,
      plan_text: '72 млн.'
    },
    {
      name: 'Касса лимитов ОБ 2025 на капремонт',
      dynamic_text: '62% (+17%)',
      dynamic_value: 62,
      plan_text: '190 млн.'
    }
  ],
  // МТиДХ
  mtidh: [
    {
      name: 'Модернизация ГЭТ',
      dynamic_value: 75
    },
    {
      name: 'ИДЖ',
      dynamic_text: '58,6% (+1,6%)',
      dynamic_value: 58.6
    },
    {
      name: 'КРСТ',
      dynamic_value: 78
    },
    {
      name: 'Субсидии МО',
      dynamic_text: ' 52% (+3%)',
      dynamic_value: 52
    },
    {
      name: 'ИТС',
      dynamic_value: 100
    }
  ],
  // МЭиТ
  meit: [
    {
      name: 'Модернизация уличного освещения, СНТ',
      task_value: 16.93,
      contract_value: 8.82,
      contract_percent: 52.1,
      fact_value: 7.63,
      fact_percent: 45.1,
      objects_plan: 25,
      objects_fact: 14
    },
    {
      name: 'Модернизация теплоснабжения',
      task_value: 187.34,
      contract_value: 156.89,
      contract_percent: 83.8,
      fact_value: 27.67,
      fact_percent: 14.8,
      objects_plan: 24,
      objects_fact: 6
    }
  ],
  // Госстройнадзор
  gosstroinadzor: [
    {
      name: 'Количество поднадзорных объектов',
      dynamic_text: '243 (+0)',
      dynamic_value: 243
    },
    {
      name: 'Количество завершённых проверок',
      dynamic_text: '320 (+8)',
      dynamic_value: 320
    },
    {
      name: 'Количество предписаний',
      dynamic_text: '52 (+0)',
      dynamic_value: 52
    },
    {
      name: 'Количество заключений/отказов',
      dynamic_text: '47 (+0)/16 (+1)'
    },
    {
      name: 'Количество протоколов',
      dynamic_text: '80 (+0)',
      dynamic_value: 80
    },
    {
      name: 'Привлечено к административной ответственности',
      dynamic_text: '31 (+3 ю.л.)/27 (+1 ю.л.)'
    },
    {
      name: 'Сумма наложенных и взысканных штрафов (тыс. руб.)',
      dynamic_text: '6520 (+150)/3630 (+75) - 56%',
      dynamic_value: 56
    },
    {
      name: 'Количество обращений',
      dynamic_text: '107 (+6)/105 (+5) - 98%',
      dynamic_value: 98
    }
  ]
};

async function importData() {
  const client = await pool.connect();

  try {
    console.log('🚀 Начинаем импорт данных проектов...\n');

    // Получим соответствия имен проектов и их ID
    for (const [catalogCode, items] of Object.entries(projectsData)) {
      console.log(`📦 Импорт данных для: ${catalogCode}`);

      for (const item of items) {
        // Найдем ID проекта
        const itemResult = await client.query(`
          SELECT pi.id
          FROM projects_items pi
          INNER JOIN projects_catalog pc ON pi.catalog_id = pc.id
          WHERE pc.code = $1 AND pi.name = $2
        `, [catalogCode, item.name]);

        if (itemResult.rows.length === 0) {
          console.log(`  ⚠️  Проект не найден: ${item.name}`);
          continue;
        }

        const itemId = itemResult.rows[0].id;

        // Вставляем данные за сентябрь 2025
        await client.query(`
          INSERT INTO projects_data (
            item_id, municipality_id, period_year, period_month,
            dynamic_text, dynamic_value, plan_text, plan_value,
            task_value, contract_value, contract_percent,
            fact_value, fact_percent, objects_plan, objects_fact
          ) VALUES ($1, NULL, 2025, 9, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (item_id, municipality_id, period_year, period_month)
          DO UPDATE SET
            dynamic_text = EXCLUDED.dynamic_text,
            dynamic_value = EXCLUDED.dynamic_value,
            plan_text = EXCLUDED.plan_text,
            plan_value = EXCLUDED.plan_value,
            task_value = EXCLUDED.task_value,
            contract_value = EXCLUDED.contract_value,
            contract_percent = EXCLUDED.contract_percent,
            fact_value = EXCLUDED.fact_value,
            fact_percent = EXCLUDED.fact_percent,
            objects_plan = EXCLUDED.objects_plan,
            objects_fact = EXCLUDED.objects_fact
        `, [
          itemId,
          item.dynamic_text || null,
          item.dynamic_value || null,
          item.plan_text || null,
          item.plan_value || null,
          item.task_value || null,
          item.contract_value || null,
          item.contract_percent || null,
          item.fact_value || null,
          item.fact_percent || null,
          item.objects_plan || null,
          item.objects_fact || null
        ]);

        console.log(`  ✅ ${item.name}`);
      }

      console.log('');
    }

    console.log('✅ Импорт завершен успешно!');

  } catch (err) {
    console.error('❌ Ошибка импорта:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Запуск
importData().catch(err => {
  console.error('Фатальная ошибка:', err);
  process.exit(1);
});
