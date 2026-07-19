import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import csv = require('csv-parser');
import { execSync } from 'child_process';

// Use a type-safe but flexible client to avoid IDE sync issues
const prisma = new PrismaClient() as any;

const parseCommaFloat = (val: string): number => {
  if (!val || val.trim() === '') return 0;
  const cleaned = val.replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

const parseICBFFloat = (val: string): number | null => {
  if (!val || val.trim() === '') return null;
  const cleaned = val.replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
};

async function parseUIS() {
  const csvFilePath = path.resolve(__dirname, '../../Base de datos Sistema Alimentos equivalentes .csv');
  const results: any[] = [];
  
  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv({
        separator: ';',
        skipLines: 1,
        headers: [
          'group', 'externalId', 'name', 'baseAmount', 'householdMeasure',
          'kcal', 'carbs', 'protein', 'fat', 'saturatedFat', 'monounsaturatedFat',
          'polyunsaturatedFat', 'cholesterol', 'solubleFiber', 'insolubleFiber',
          'totalFiber', 'calcium', 'phosphorus', 'sodium', 'potassium', 'magnesium',
          'iron', 'zinc', 'copper', 'manganese', 'selenium', 'vitE', 'vitK',
          'vitD', 'vitA', 'vitB1', 'vitB2', 'vitB3', 'vitB5', 'vitB6', 'vitB9',
          'vitB12', 'vitC', 'approved'
        ]
      }))
      .on('data', (data: any) => {
        if (data.group === 'Grupo alimentario' || !data.name || data.name.trim() === '') return;

        results.push({
          group: data.group,
          externalId: data.externalId,
          name: data.name.trim(),
          baseAmount: parseCommaFloat(data.baseAmount),
          householdMeasure: data.householdMeasure?.trim() || '',
          kcal: parseCommaFloat(data.kcal),
          carbs: parseCommaFloat(data.carbs),
          protein: parseCommaFloat(data.protein),
          fat: parseCommaFloat(data.fat),
          saturatedFat: parseCommaFloat(data.saturatedFat),
          monounsaturatedFat: parseCommaFloat(data.monounsaturatedFat),
          polyunsaturatedFat: parseCommaFloat(data.polyunsaturatedFat),
          cholesterol: parseCommaFloat(data.cholesterol),
          solubleFiber: parseCommaFloat(data.solubleFiber),
          insolubleFiber: parseCommaFloat(data.insolubleFiber),
          totalFiber: parseCommaFloat(data.totalFiber),
          calcium: parseCommaFloat(data.calcium),
          phosphorus: parseCommaFloat(data.phosphorus),
          sodium: parseCommaFloat(data.sodium),
          potassium: parseCommaFloat(data.potassium),
          magnesium: parseCommaFloat(data.magnesium),
          iron: parseCommaFloat(data.iron),
          zinc: parseCommaFloat(data.zinc),
          copper: parseCommaFloat(data.copper),
          manganese: parseCommaFloat(data.manganese),
          selenium: parseCommaFloat(data.selenium),
          vitE: parseCommaFloat(data.vitE),
          vitK: parseCommaFloat(data.vitK),
          vitD: parseCommaFloat(data.vitD),
          vitA: parseCommaFloat(data.vitA),
          vitB1: parseCommaFloat(data.vitB1),
          vitB2: parseCommaFloat(data.vitB2),
          vitB3: parseCommaFloat(data.vitB3),
          vitB5: parseCommaFloat(data.vitB5),
          vitB6: parseCommaFloat(data.vitB6),
          vitB9: parseCommaFloat(data.vitB9),
          vitB12: parseCommaFloat(data.vitB12),
          vitC: parseCommaFloat(data.vitC)
        });
      })
      .on('end', async () => {
        console.log(`Parsed ${results.length} UIS foods. Seeding...`);
        for (const food of results) {
          try {
            await prisma.foodUis.create({ data: food });
          } catch (err) {
            console.error(`Error creating foodUis ${food.name}:`, err);
          }
        }
        resolve();
      })
      .on('error', reject);
  });
}

async function parseICBF() {
  const mdFilePath = path.resolve(__dirname, '../../ICBF.md');
  const content = fs.readFileSync(mdFilePath, 'utf8');
  
  const results: any[] = [];
  
  // Filter out header lines to avoid merging them into preceding rows
  const lines = content.split('\n').filter(line => line.trim() !== '' && !line.startsWith('Código,'));
  const cleanContent = lines.join('\n');

  const matches = cleanContent.match(/[A-Z]\d{3},.+?(?=(?:[A-Z]\d{3},)|$)/gs);
  
  if (!matches) {
    console.log("No ICBF records found.");
    return;
  }

  const NUTRITION_COLUMNS_LAYOUT1 = [
    'water', 'kcal', 'energy_kj', 'protein', 'fat', 'carbsTotal', 'carbs',
    'totalFiber', 'ash', 'calcium', 'iron', 'sodium', 'phosphorus', 'iodine',
    'zinc', 'magnesium', 'potassium', 'vitB1', 'vitB2', 'vitB3', 'vitB9',
    'vitB12', 'vitC', 'vitA', 'saturatedFat', 'monounsaturatedFat',
    'polyunsaturatedFat', 'cholesterol', 'ediblePart'
  ];

  const NUTRITION_COLUMNS_LAYOUT2 = [
    'water', 'kcal', 'energy_kj', 'protein', 'fat', 'carbsTotal', 'carbs',
    'totalFiber', 'ash', 'calcium', 'iron', 'sodium', 'phosphorus', 'iodine',
    'zinc', 'magnesium', 'potassium', 'vitB1', 'vitB2', 'vitB3', 'vitB9',
    'vitB12', 'vitC', 'vitA', 'ediblePart'
  ];

  for (let rawLine of matches) {
    const line = rawLine.replace(/\r?\n/g, '').trim();
    const cols = line.match(/(?:"([^"]*)"|([^,]*))(?:,|$)/g);
    if (!cols) continue;
    
    const values = cols.map(m => m.replace(/,$/, '').replace(/^\"|\"$/g, '').trim());
    if (values.length > 0 && values[values.length - 1] === '') {
      values.pop();
    }

    const code = values[0];
    if (!code || code === 'Código') continue;

    // Detectar el primer índice numérico (Humedad)
    let hIdx = -1;
    for (let i = 2; i < values.length; i++) {
      const val = values[i];
      if (val !== '' && val !== '-' && !isNaN(parseFloat(val.replace(',', '.')))) {
        hIdx = i;
        break;
      }
    }

    if (hIdx === -1) {
      console.warn(`Warning: No numeric fields found for ${code}`);
      continue;
    }

    // Reconstruir nombre y parte analizada resolviendo comas internas no citadas
    const name = hIdx > 2 ? values.slice(1, hIdx - 1).join(', ') : values[1];
    const analyzedPart = hIdx > 2 ? values[hIdx - 1] : "";

    const prefix = code.charAt(0);
    
    // 1. Determine dynamic layout
    const isLayout1Default = ['A', 'D', 'E', 'F', 'G', 'J', 'N', 'R', 'S'].includes(prefix);
    const numericValues = values.slice(hIdx);
    const parsedNums = numericValues.map(v => parseICBFFloat(v));

    let isLayout1 = isLayout1Default;
    // Upgradear Layout 2 a Layout 1 si tiene detalles de grasas (largo numérico >= 28)
    if (!isLayout1Default && parsedNums.length >= 28) {
      isLayout1 = true;
    }

    const layoutColumns = isLayout1 ? NUTRITION_COLUMNS_LAYOUT1 : NUTRITION_COLUMNS_LAYOUT2;

    // 2. Apply shift corrections
    if (isLayout1) {
      // Para grupos de origen animal (E, F, G, J) y grasas sólidas (D014-D020), la columna totalFiber (índice 7) siempre está omitida en origen
      const isSolidFat = prefix === 'D' && parseInt(code.substring(1)) >= 14;
      if (['E', 'F', 'G', 'J'].includes(prefix) || isSolidFat) {
        parsedNums.splice(7, 0, null);
      }
      // Para los aceites vegetales líquidos (D001-D013), la columna vitA (índice 23) siempre está omitida en origen
      const isLiquidOil = prefix === 'D' && parseInt(code.substring(1)) < 14;
      if (isLiquidOil) {
        parsedNums.splice(23, 0, null);
      }

      // Corregir comas omitidas en el medio de ciertos cereales (como A002, A003)
      // Si potasio (índice 16) tiene un valor muy bajo (ej: < 1), es en realidad Tiamina desfasada
      if (parsedNums.length > 16 && parsedNums[16] !== null && parsedNums[16] < 1.0 && parsedNums[16] > 0) {
        parsedNums.splice(16, 0, null);
      }
    } else {
      // Layout 2
      if (parsedNums.length === 24) {
        if (prefix === 'P') {
          // Yodo (index 13) is missing
          parsedNums.splice(13, 0, null);
        }
      } else if (parsedNums.length === 23 && prefix === 'P') {
        // P has some foods with 23 columns (missing Yodo at 13 and VitA at 23)
        parsedNums.splice(13, 0, null);
        parsedNums.splice(23, 0, null);
      }
    }

    const foodRecord: any = {
      code,
      name,
      analyzedPart,
      water: null, kcal: null, energy_kj: null, protein: null, fat: null,
      carbsTotal: null, carbs: null, totalFiber: null, ash: null,
      calcium: null, iron: null, sodium: null, phosphorus: null,
      iodine: null, zinc: null, magnesium: null, potassium: null,
      vitB1: null, vitB2: null, vitB3: null, vitB9: null, vitB12: null,
      vitC: null, vitA: null, saturatedFat: null, monounsaturatedFat: null,
      polyunsaturatedFat: null, cholesterol: null, ediblePart: null
    };

    // Mapear valores secuencialmente
    for (let i = 0; i < parsedNums.length && i < layoutColumns.length; i++) {
      const colName = layoutColumns[i];
      foodRecord[colName] = parsedNums[i];
    }

    // Si el arreglo es más largo que el layout, la parte comestible está desplazada al final
    if (parsedNums.length > layoutColumns.length) {
      let lastVal = null;
      for (let j = parsedNums.length - 1; j >= 0; j--) {
        if (parsedNums[j] !== null) {
          lastVal = parsedNums[j];
          break;
        }
      }
      if (lastVal !== null) {
        foodRecord.ediblePart = lastVal;
      }
    }

    // Por defecto, la parte comestible es 100 si no está en la fila
    if (foodRecord.ediblePart === null) {
      foodRecord.ediblePart = 100;
    }

    // Normalizar la parte comestible a formato porcentual 0-100%
    if (foodRecord.ediblePart !== null) {
      if (foodRecord.ediblePart <= 1 && foodRecord.ediblePart > 0) {
        foodRecord.ediblePart = foodRecord.ediblePart * 100;
      }
      if (foodRecord.ediblePart > 100) {
        foodRecord.ediblePart = 100;
      }
    }

    results.push(foodRecord);
  }

  console.log(`Parsed ${results.length} ICBF foods. Seeding...`);
  for (const food of results) {
    try {
      await prisma.foodIcbf.create({ data: food });
    } catch (err) {
      console.error(`Error creating foodIcbf ${food.name}:`, err);
    }
  }
}

async function main() {
  await prisma.logEntry.deleteMany({});
  await prisma.foodUis.deleteMany({});
  await prisma.foodIcbf.deleteMany({});

  await parseUIS();
  await parseICBF();

  console.log('Running comprehensive profiles seeding...');
  execSync(`npx ts-node "${path.resolve(__dirname, 'seed_profiles.ts')}"`, { stdio: 'inherit' });

  console.log('Running hydration seeding...');
  execSync(`npx ts-node "${path.resolve(__dirname, 'seed_hydration.ts')}"`, { stdio: 'inherit' });

  console.log('Seeding finished successfully with clean data.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });