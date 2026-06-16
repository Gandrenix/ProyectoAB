import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const hydrationRequirements = [
  { minAge: 0, maxAge: 0, gender: 'BOTH', totalWater_ml: 700, foodWaterTarget_ml: 0, freeFluidTarget_ml: 700 }, // 0-6 months (0.5 year represented as 0 here, or handled specially)
  { minAge: 1, maxAge: 1, gender: 'BOTH', totalWater_ml: 900, foodWaterTarget_ml: 260, freeFluidTarget_ml: 640 }, // 6-12 months
  { minAge: 1, maxAge: 3, gender: 'BOTH', totalWater_ml: 1350, foodWaterTarget_ml: 350, freeFluidTarget_ml: 1000 },
  { minAge: 4, maxAge: 8, gender: 'BOTH', totalWater_ml: 1650, foodWaterTarget_ml: 410, freeFluidTarget_ml: 1240 },
  { minAge: 9, maxAge: 13, gender: 'M', totalWater_ml: 2250, foodWaterTarget_ml: 610, freeFluidTarget_ml: 1640 },
  { minAge: 9, maxAge: 13, gender: 'F', totalWater_ml: 2000, foodWaterTarget_ml: 540, freeFluidTarget_ml: 1460 },
  { minAge: 14, maxAge: 18, gender: 'M', totalWater_ml: 2900, foodWaterTarget_ml: 650, freeFluidTarget_ml: 2250 },
  { minAge: 14, maxAge: 18, gender: 'F', totalWater_ml: 2150, foodWaterTarget_ml: 550, freeFluidTarget_ml: 1600 },
  { minAge: 19, maxAge: 70, gender: 'M', totalWater_ml: 3100, foodWaterTarget_ml: 600, freeFluidTarget_ml: 2500 },
  { minAge: 19, maxAge: 70, gender: 'F', totalWater_ml: 2350, foodWaterTarget_ml: 450, freeFluidTarget_ml: 1900 },
  { minAge: 71, maxAge: 120, gender: 'M', totalWater_ml: 3100, foodWaterTarget_ml: 600, freeFluidTarget_ml: 2500 },
  { minAge: 71, maxAge: 120, gender: 'F', totalWater_ml: 2350, foodWaterTarget_ml: 450, freeFluidTarget_ml: 1900 },
];

const locationModifiers = [
  { city: 'Bogotá', department: 'Cundinamarca', altitude: 2582, thermalFloor: 'Frío', adjustmentFactor: 0.175 },
  { city: 'Medellín', department: 'Antioquia', altitude: 1495, thermalFloor: 'Templado', adjustmentFactor: 0.0 },
  { city: 'Arauca', department: 'Arauca', altitude: 125, thermalFloor: 'Cálido', adjustmentFactor: 0.20 },
  { city: 'Barranquilla', department: 'Atlántico', altitude: 5, thermalFloor: 'Cálido', adjustmentFactor: 0.30 },
  { city: 'Cartagena de Indias', department: 'Bolívar', altitude: 2, thermalFloor: 'Cálido', adjustmentFactor: 0.30 },
  { city: 'Tunja', department: 'Boyacá', altitude: 2820, thermalFloor: 'Frío', adjustmentFactor: 0.25 },
  { city: 'Manizales', department: 'Caldas', altitude: 2200, thermalFloor: 'Frío', adjustmentFactor: 0.125 },
  { city: 'Florencia', department: 'Caquetá', altitude: 242, thermalFloor: 'Cálido', adjustmentFactor: 0.15 },
  { city: 'Yopal', department: 'Casanare', altitude: 350, thermalFloor: 'Cálido', adjustmentFactor: 0.20 },
  { city: 'Popayán', department: 'Cauca', altitude: 1760, thermalFloor: 'Templado', adjustmentFactor: 0.0 },
  { city: 'Valledupar', department: 'Cesar', altitude: 168, thermalFloor: 'Cálido', adjustmentFactor: 0.325 },
  { city: 'Quibdó', department: 'Chocó', altitude: 53, thermalFloor: 'Cálido', adjustmentFactor: 0.35 },
  { city: 'Montería', department: 'Córdoba', altitude: 18, thermalFloor: 'Cálido', adjustmentFactor: 0.25 },
  { city: 'Inírida', department: 'Guainía', altitude: 95, thermalFloor: 'Cálido', adjustmentFactor: 0.25 },
  { city: 'San José del Guaviare', department: 'Guaviare', altitude: 175, thermalFloor: 'Cálido', adjustmentFactor: 0.25 },
  { city: 'Neiva', department: 'Huila', altitude: 442, thermalFloor: 'Cálido', adjustmentFactor: 0.30 },
  { city: 'Riohacha', department: 'La Guajira', altitude: 5, thermalFloor: 'Cálido', adjustmentFactor: 0.30 },
  { city: 'Santa Marta', department: 'Magdalena', altitude: 2, thermalFloor: 'Cálido', adjustmentFactor: 0.30 },
  { city: 'Villavicencio', department: 'Meta', altitude: 467, thermalFloor: 'Cálido', adjustmentFactor: 0.20 },
  { city: 'Pasto', department: 'Nariño', altitude: 2527, thermalFloor: 'Frío', adjustmentFactor: 0.20 },
  { city: 'Cúcuta', department: 'Norte de Santander', altitude: 320, thermalFloor: 'Cálido', adjustmentFactor: 0.30 },
  { city: 'Mocoa', department: 'Putumayo', altitude: 604, thermalFloor: 'Cálido-Templado', adjustmentFactor: 0.15 },
  { city: 'Armenia', department: 'Quindío', altitude: 1551, thermalFloor: 'Templado', adjustmentFactor: 0.0 },
  { city: 'Pereira', department: 'Risaralda', altitude: 1411, thermalFloor: 'Templado', adjustmentFactor: 0.0 },
  { city: 'San Andrés', department: 'San Andrés', altitude: 2, thermalFloor: 'Cálido', adjustmentFactor: 0.30 },
  { city: 'Bucaramanga', department: 'Santander', altitude: 959, thermalFloor: 'Templado-Cálido', adjustmentFactor: 0.05 },
  { city: 'Sincelejo', department: 'Sucre', altitude: 213, thermalFloor: 'Cálido', adjustmentFactor: 0.20 },
  { city: 'Ibagué', department: 'Tolima', altitude: 1285, thermalFloor: 'Templado', adjustmentFactor: 0.0 },
  { city: 'Cali', department: 'Valle del Cauca', altitude: 995, thermalFloor: 'Cálido', adjustmentFactor: 0.20 },
  { city: 'Mitú', department: 'Vaupés', altitude: 183, thermalFloor: 'Cálido', adjustmentFactor: 0.25 },
  { city: 'Puerto Carreño', department: 'Vichada', altitude: 51, thermalFloor: 'Cálido', adjustmentFactor: 0.325 },
];

async function main() {
  console.log('Starting hydration seeding...');

  await prisma.hydrationRequirement.deleteMany();
  await prisma.locationModifier.deleteMany();

  for (const req of hydrationRequirements) {
    await prisma.hydrationRequirement.create({ data: req });
  }

  for (const loc of locationModifiers) {
    await prisma.locationModifier.create({ data: loc });
  }

  console.log('Hydration seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
