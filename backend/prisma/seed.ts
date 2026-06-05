import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

const prisma = new PrismaClient();

interface FoodData {
  group: string;
  externalId: string;
  name: string;
  baseAmount: number;
  householdMeasure: string;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  saturatedFat: number;
  monounsaturatedFat: number;
  polyunsaturatedFat: number;
  cholesterol: number;
  solubleFiber: number;
  insolubleFiber: number;
  totalFiber: number;
  calcium: number;
  phosphorus: number;
  sodium: number;
  potassium: number;
  magnesium: number;
  iron: number;
  zinc: number;
  copper: number;
  manganese: number;
  selenium: number;
  vitE: number;
  vitK: number;
  vitD: number;
  vitA: number;
  vitB1: number;
  vitB2: number;
  vitB3: number;
  vitB5: number;
  vitB6: number;
  vitB9: number;
  vitB12: number;
  vitC: number;
}

async function main() {
  const csvFilePath = path.resolve(__dirname, '../../Base de datos Sistema Alimentos equivalentes .csv');
  
  const results: FoodData[] = [];

  const parseCommaFloat = (val: string): number => {
    if (!val || val.trim() === '') return 0;
    const cleaned = val.replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  console.log('Starting seed process with standard UTF-8...');

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
      console.log(`Parsed ${results.length} foods. Seeding...`);
      
      await prisma.logEntry.deleteMany({});
      await prisma.food.deleteMany({});
      
      for (const food of results) {
        try {
          await prisma.food.create({
            data: food
          });
        } catch (err) {
          console.error(`Error creating food ${food.name}:`, err);
        }
      }

      console.log('Seeding finished successfully with clean data.');
      await prisma.$disconnect();
    });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
