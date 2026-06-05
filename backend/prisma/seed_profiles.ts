import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting comprehensive profiles seeding...');

  // 1. Crear usuario por defecto (opcional, pero útil para pruebas)
  const defaultUserId = 'default-user';
  await prisma.user.upsert({
    where: { id: defaultUserId },
    update: {},
    create: {
      id: defaultUserId,
      name: 'Usuario Prototipo',
      age: 30,
      gender: 'M',
      weight: 75,
      activityLevel: 'MODERADA'
    }
  });
  console.log('Default user verified (30 years old)');

  // 2. Limpiar tablas de requerimientos
  await prisma.energyRequirement.deleteMany({});
  await prisma.nutrientRequirement.deleteMany({});

  const profilesPath = path.resolve(__dirname, '../../Perfiles Nutricionales.md');
  const content = fs.readFileSync(profilesPath, 'utf-8');

  const parseVal = (v: string, alreadyDecimal: boolean = false) => {
    if (!v || v.trim() === '-' || v.trim() === '') return null;
    if (alreadyDecimal) return parseFloat(v.trim());
    // Handle cases like "1.100" or "2,500" or "1,2"
    let clean = v.trim().replace(/\./g, '');
    clean = clean.replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? null : parsed;
  };

  const parseAgeRange = (text: string): { min: number; max: number; gender: string } => {
    const t = text.toLowerCase();
    let gender = 'BOTH';
    if (t.includes('hombres') && t.includes('mujeres')) gender = 'BOTH';
    else if (t.includes('hombres')) gender = 'M';
    else if (t.includes('mujeres')) gender = 'F';

    // Matches patterns like "1-2", "18 a 29,9", "Mayor de 70", "> 70"
    const rangeMatch = text.match(/(\d+)\s*[-a]\s*(\d+)/);
    if (rangeMatch) {
      return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]), gender };
    }

    const overMatch = text.match(/(?:mayor|mayor de|>)\s*(\d+)/i);
    if (overMatch) {
      return { min: parseInt(overMatch[1]), max: 120, gender };
    }

    const singleMatch = text.match(/(\d+)/);
    if (singleMatch) {
      const val = parseInt(singleMatch[1]);
      return { min: val, max: val, gender };
    }

    return { min: 0, max: 120, gender };
  };

  // --- PARSEAR ENERGIA ---
  // Energía niños 1-18
  const energyKidsMatch = content.match(/Perfil Energia niños y niñas 1-18 años[\s\S]+?EDAD.*?([\s\S]+?)(?=REQUERIMIENTO)/);
  if (energyKidsMatch) {
    const lines = energyKidsMatch[1].trim().split('\n');
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(';');
      if (parts.length < 7) continue;
      const { min } = parseAgeRange(parts[0]);
      await prisma.energyRequirement.create({
        data: { age: min, gender: 'M', moderate: parseVal(parts[3]) || 0, light: parseVal(parts[1]), vigorous: parseVal(parts[5]) }
      });
      await prisma.energyRequirement.create({
        data: { age: min, gender: 'F', moderate: parseVal(parts[4]) || 0, light: parseVal(parts[2]), vigorous: parseVal(parts[6]) }
      });
    }
  }

  // Energía Adultos (Tablas por peso sin tags csv)
  const adultEnergyRegex = /Requerimiento promedio de energía para (hombres|mujeres) de (\d+) a ([\d,]+) años[\s\S]+?Peso Promedio.*?\n([\s\S]+?)(?=Requerimiento|~~~|$)/g;
  let m;
  while ((m = adultEnergyRegex.exec(content)) !== null) {
    const gender = m[1] === 'hombres' ? 'M' : 'F';
    const minAge = parseInt(m[2]);
    const maxAge = parseInt(m[3].replace(',', '.'));
    const lines = m[4].trim().split('\n');
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(';');
      if (parts.length < 8) continue;
      for (let age = minAge; age <= (maxAge > 100 ? 100 : maxAge); age++) {
        const tmbKg = parseVal(parts[1]); // TMB/kg
        if (tmbKg) {
          await prisma.energyRequirement.upsert({
            where: { age_gender: { age, gender } },
            update: {},
            create: {
              age, gender,
              light: tmbKg * 1.5,
              moderate: tmbKg * 1.82,
              vigorous: tmbKg * 2.12
            }
          });
        }
      }
    }
  }
  
  // Caso "60 años y más"
  const seniorEnergyRegex = /Requerimiento promedio de energía para (hombres|mujeres) de 60 años y más[\s\S]+?Peso Promedio.*?\n([\s\S]+?)(?=Requerimiento|~~~|##|$)/g;
  while ((m = seniorEnergyRegex.exec(content)) !== null) {
    const gender = m[1] === 'hombres' ? 'M' : 'F';
    const lines = m[2].trim().split('\n');
    for (let age = 60; age <= 100; age++) {
      const parts = lines[Math.floor(lines.length / 2)].split(';');
      const tmbKg = parseVal(parts[1]);
      if (tmbKg) {
        await prisma.energyRequirement.upsert({
          where: { age_gender: { age, gender } },
          update: {},
          create: { age, gender, light: tmbKg * 1.5, moderate: tmbKg * 1.82, vigorous: tmbKg * 2.12 }
        });
      }
    }
  }

  // --- PARSEAR NUTRIENTES (GENERAL) ---
  const sections = [
    { title: '## Proteina', nutrient: 'protein' },
    { title: '## CARBOHIDRATOS', nutrient: 'carbs' },
    { title: '## FIBRA', nutrient: 'totalFiber' },
    { title: '## Vitaminas Liposolubles', type: 'multi' },
    { title: '## Macrominerales', type: 'multi_macro' },
    { title: '## Microminerales', type: 'multi_micro' }
  ];

  for (const section of sections) {
    const regex = new RegExp(`${section.title}\\s+~~~\\s*(?:csv)?\\s+([\\s\\S]+?)\\s+~~~`);
    const match = content.match(regex);
    if (!match) continue;

    const lines = match[1].trim().split('\n');
    const separator = match[1].includes(';') ? ';' : ',';

    for (let i = 1; i < lines.length; i++) {
      let line = lines[i];
      if (separator === ',') line = line.replace(/(\d),(\d)/g, '$1.$2');
      const parts = line.split(separator);
      if (parts.length < 3) continue;

      const { min, max, gender } = parseAgeRange(parts[0] + ' ' + parts[1]);

      if (section.nutrient === 'protein') {
        const rda = parseVal(parts[2]);
        if (rda) await prisma.nutrientRequirement.create({ data: { minAge: min, maxAge: max, gender, nutrient: 'protein', value: rda, unit: 'g/kg/day', type: 'RDA' } });
        const amdr = parts[3]?.split('-');
        if (amdr?.length === 2) {
          await prisma.nutrientRequirement.create({ data: { minAge: min, maxAge: max, gender, nutrient: 'protein', value: parseVal(amdr[0]) || 0, unit: '%', type: 'AMDR_MIN' } });
          await prisma.nutrientRequirement.create({ data: { minAge: min, maxAge: max, gender, nutrient: 'protein', value: parseVal(amdr[1]) || 0, unit: '%', type: 'AMDR_MAX' } });
        }
      } else if (section.nutrient === 'carbs') {
        const rda = parseVal(parts[2]);
        if (rda) await prisma.nutrientRequirement.create({ data: { minAge: min, maxAge: max, gender, nutrient: 'carbs', value: rda, unit: 'g/day', type: 'RDA' } });
        const amdr = parts[3]?.split('-');
        if (amdr?.length === 2) {
          await prisma.nutrientRequirement.create({ data: { minAge: min, maxAge: max, gender, nutrient: 'carbs', value: parseVal(amdr[0]) || 0, unit: '%', type: 'AMDR_MIN' } });
          await prisma.nutrientRequirement.create({ data: { minAge: min, maxAge: max, gender, nutrient: 'carbs', value: parseVal(amdr[1]) || 0, unit: '%', type: 'AMDR_MAX' } });
        }
      } else if (section.nutrient === 'totalFiber') {
        const valM = parseVal(parts[2]);
        const valF = parseVal(parts[3]);
        if (valM) await prisma.nutrientRequirement.create({ data: { minAge: min, maxAge: max, gender: 'M', nutrient: 'totalFiber', value: valM, unit: 'g/day', type: 'AI' } });
        if (valF) await prisma.nutrientRequirement.create({ data: { minAge: min, maxAge: max, gender: 'F', nutrient: 'totalFiber', value: valF, unit: 'g/day', type: 'AI' } });
      } else if (section.type === 'multi') {
        const map = [
          { n: 'vitA', t: 'RDA', u: 'mcg/day', idx: 2 }, { n: 'vitA', t: 'UL', u: 'mcg/day', idx: 3 },
          { n: 'vitD', t: 'RDA', u: 'UI/day', idx: 4 }, { n: 'vitD', t: 'UL', u: 'UI/day', idx: 5 },
          { n: 'vitE', t: 'AI', u: 'mg/day', idx: 6 }, { n: 'vitE', t: 'UL', u: 'mg/day', idx: 7 },
          { n: 'vitK', t: 'AI', u: 'mcg/day', idx: 8 }
        ];
        for (const item of map) {
          const val = parseVal(parts[item.idx]);
          if (val) await prisma.nutrientRequirement.create({ data: { minAge: min, maxAge: max, gender, nutrient: item.n, value: val, unit: item.u, type: item.t } });
        }
      } else if (section.type === 'multi_macro') {
        const map = [
          { n: 'calcium', t: 'RDA', idx: 2 }, { n: 'calcium', t: 'UL', idx: 3 },
          { n: 'phosphorus', t: 'RDA', idx: 4 }, { n: 'phosphorus', t: 'UL', idx: 5 },
          { n: 'magnesium', t: 'RDA', idx: 6 }, { n: 'magnesium', t: 'UL', idx: 7 },
          { n: 'sodium', t: 'AI', idx: 8 }, { n: 'sodium', t: 'UL', idx: 9 },
          { n: 'potassium', t: 'AI', idx: 10 }
        ];
        for (const item of map) {
          const val = parseVal(parts[item.idx]);
          if (val) await prisma.nutrientRequirement.create({ data: { minAge: min, maxAge: max, gender, nutrient: item.n, value: val, unit: 'mg/day', type: item.t } });
        }
      } else if (section.type === 'multi_micro') {
        const map = [
          { n: 'iron', t: 'RDA', idx: 2 }, { n: 'iron', t: 'UL', idx: 3 },
          { n: 'zinc', t: 'RDA', idx: 4 }, { n: 'zinc', t: 'UL', idx: 5 },
          { n: 'selenium', t: 'RDA', idx: 8 }, { n: 'selenium', t: 'UL', idx: 9 },
          { n: 'copper', t: 'RDA', idx: 10, scale: 0.001 }, { n: 'copper', t: 'UL', idx: 11, scale: 0.001 }
        ];
        for (const item of map) {
          let val = parseVal(parts[item.idx]);
          if (val) {
            if (item.scale) val *= item.scale;
            await prisma.nutrientRequirement.create({ data: { minAge: min, maxAge: max, gender, nutrient: item.n, value: val, unit: item.n === 'selenium' ? 'mcg/day' : 'mg/day', type: item.t } });
          }
        }
      }
    }
  }

  // --- PARSEAR VITAMINAS HIDROSOLUBLES (CON PRECISIÓN DE 18 COLUMNAS POR DECIMALES) ---
  const vitHidroMatch = content.match(/## Vitaminas Hidrosolubles\s+~~~\s*csv\s+([\s\S]+?)\s+~~~/);
  if (vitHidroMatch) {
    const lines = vitHidroMatch[1].trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length < 18) continue;
      
      const { min, max, gender } = parseAgeRange(parts[0] + ' ' + parts[1]);
      const reqs = [
        { nutrient: 'vitC', val: parts[2], type: 'RDA', unit: 'mg/day', isDec: false },
        { nutrient: 'vitC', val: parts[3], type: 'UL', unit: 'mg/day', isDec: false },
        { nutrient: 'vitB1', val: parts[4] + '.' + parts[5], type: 'RDA', unit: 'mg/day', isDec: true },
        { nutrient: 'vitB2', val: parts[6] + '.' + parts[7], type: 'RDA', unit: 'mg/day', isDec: true },
        { nutrient: 'vitB3', val: parts[8], type: 'RDA', unit: 'mg/day', isDec: false },
        { nutrient: 'vitB3', val: parts[9], type: 'UL', unit: 'mg/day', isDec: false },
        { nutrient: 'vitB6', val: parts[10] + '.' + parts[11], type: 'RDA', unit: 'mg/day', isDec: true },
        { nutrient: 'vitB6', val: parts[12], type: 'UL', unit: 'mg/day', isDec: false },
        { nutrient: 'vitB9', val: parts[13], type: 'RDA', unit: 'mcg/day', isDec: false },
        { nutrient: 'vitB9', val: parts[14], type: 'UL', unit: 'mcg/day', isDec: false },
        { nutrient: 'vitB12', val: parts[15] + '.' + parts[16], type: 'RDA', unit: 'mcg/day', isDec: true },
        { nutrient: 'vitB5', val: parts[17], type: 'AI', unit: 'mg/day', isDec: false }
      ];

      for (const req of reqs) {
        const val = parseVal(req.val, req.isDec);
        if (val !== null && val > 0) {
          await prisma.nutrientRequirement.create({ data: { minAge: min, maxAge: max, gender, nutrient: req.nutrient, value: val, unit: req.unit, type: req.type } });
        }
      }
    }
  }

  // --- PARSEAR GRASAS (CASO ESPECIAL) ---
  const fatsMatch = content.match(/## Grasas\s+~~~\s*csv\s+([\s\S]+?)\s+~~~/);
  if (fatsMatch) {
    const lines = fatsMatch[1].trim().split('\n');
    const ranges = [
      { min: 1, max: 3, totalIdx: 1, polyIdx: 1 }, 
      { min: 4, max: 18, totalIdx: 2, polyIdx: 2 },
      { min: 19, max: 120, totalIdx: 3, polyIdx: 3 }
    ];
    for (const r of ranges) {
      for (const line of lines) {
        const parts = line.split(';');
        const nutrientStr = parts[0].toLowerCase();
        let nutrient = null;
        if (nutrientStr.includes('grasa total')) nutrient = 'fat';
        else if (nutrientStr.includes('poliinsaturados n-6')) nutrient = 'polyunsaturatedFat';
        else if (nutrientStr.includes('saturados')) nutrient = 'saturatedFat';
        else if (nutrientStr.includes('colesterol')) nutrient = 'cholesterol';

        if (nutrient) {
          const valStr = nutrient === 'cholesterol' ? parts[3] : parts[nutrient === 'fat' ? r.totalIdx : r.polyIdx];
          if (!valStr || valStr.trim() === '-' || valStr.trim() === '') continue;

          if (nutrient === 'cholesterol') {
            const val = parseVal(valStr.replace('<', '').replace('mg', ''));
            if (val) await prisma.nutrientRequirement.create({ data: { minAge: r.min, maxAge: r.max, gender: 'BOTH', nutrient: 'cholesterol', value: val, unit: 'mg/day', type: 'UL' } });
          } else {
            const clean = valStr.replace('<', '').trim();
            if (clean.includes('-')) {
              const [minV, maxV] = clean.split('-').map(v => parseVal(v));
              if (minV !== null) await prisma.nutrientRequirement.create({ data: { minAge: r.min, maxAge: r.max, gender: 'BOTH', nutrient, value: minV, unit: '%', type: 'AMDR_MIN' } });
              if (maxV !== null) await prisma.nutrientRequirement.create({ data: { minAge: r.min, maxAge: r.max, gender: 'BOTH', nutrient, value: maxV, unit: '%', type: 'AMDR_MAX' } });
            } else {
              const val = parseVal(clean);
              if (val !== null) await prisma.nutrientRequirement.create({ data: { minAge: r.min, maxAge: r.max, gender: 'BOTH', nutrient, value: val, unit: '%', type: 'AMDR_MAX' } });
            }
          }
        }
      }
    }
  }

  console.log('Profiles seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });