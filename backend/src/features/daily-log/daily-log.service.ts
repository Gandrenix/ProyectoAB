import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InputType } from '@prisma/client';

const NUTRITION_KEYS = [
  'kcal', 'carbs', 'protein', 'fat', 
  'saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat', 'cholesterol',
  'solubleFiber', 'insolubleFiber', 'totalFiber',
  'calcium', 'phosphorus', 'sodium', 'potassium', 'magnesium',
  'iron', 'zinc', 'copper', 'manganese', 'selenium',
  'vitE', 'vitK', 'vitD', 'vitA',
  'vitB1', 'vitB2', 'vitB3', 'vitB5', 'vitB6', 'vitB9', 'vitB12', 'vitC', 'water'
];

@Injectable()
export class DailyLogService {
  constructor(private readonly prisma: PrismaService) {}


  async addEntry(dto: {
    date: string;
    userId: string;
    foodUisId?: number;
    foodIcbfId?: number;
    mealType: string;
    inputType: InputType;
    inputAmount: number;
  }) {
    let dailyLog = await this.prisma.dailyLog.findUnique({
      where: {
        date_userId: {
          date: new Date(dto.date),
          userId: dto.userId,
        },
      },
    });

    if (!dailyLog) {
      dailyLog = await this.prisma.dailyLog.create({
        data: {
          date: new Date(dto.date),
          userId: dto.userId,
        },
      });
    }

    return this.prisma.logEntry.create({
      data: {
        dailyLogId: dailyLog.id,
        foodUisId: dto.foodUisId,
        foodIcbfId: dto.foodIcbfId,
        mealType: dto.mealType,
        inputType: dto.inputType,
        inputAmount: dto.inputAmount,
      },
      include: {
        foodUis: true,
        foodIcbf: true,
      },
    });
  }

  async getDailySummary(userId: string, dateStr: string) {
    const date = new Date(dateStr);
    
    const [dailyLog, user] = await Promise.all([
      this.prisma.dailyLog.findUnique({
        where: {
          date_userId: {
            date,
            userId,
          },
        },
        include: {
          entries: {
            include: {
              foodUis: true,
              foodIcbf: true,
            },
          },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId }
      })
    ]);

    const emptyTotals = this.getEmptyTotals();

    if (!dailyLog) {
      return {
        entries: [],
        totals: emptyTotals,
        targets: await this.calculateTargets(user),
        user
      };
    }

    const calculatedEntries = dailyLog.entries.map((entry) => {
      const isUIS = !!entry.foodUis;
      const food: any = isUIS ? entry.foodUis : entry.foodIcbf;
      const baseAmount = isUIS ? food.baseAmount : 100;

      const factor =
        entry.inputType === InputType.HOUSEHOLD
          ? entry.inputAmount
          : entry.inputAmount / baseAmount;

      const calculated: any = {};
      NUTRITION_KEYS.forEach(key => {
        const val = food[key] ?? 0;
        calculated[key] = val * factor;
      });

      return {
        ...entry,
        food,
        source: isUIS ? 'UIS' : 'ICBF',
        calculated,
      };
    });

    const totals = calculatedEntries.reduce(
      (acc, curr) => {
        NUTRITION_KEYS.forEach(key => {
          acc[key] = (acc[key] || 0) + (curr.calculated[key] || 0);
        });
        return acc;
      },
      { ...emptyTotals }
    );

    return {
      id: dailyLog.id,
      date: dailyLog.date,
      entries: calculatedEntries,
      totals: {
        ...totals,
        waterIntake_ml: dailyLog.waterIntake_ml,
        totalWater_ml: (totals.water || 0) + dailyLog.waterIntake_ml,
      },
      targets: await this.calculateTargets(user),
      user
    };
  }

  private async calculateTargets(user: any) {
    console.log(`[DailyLogService] calculateTargets called for user:`, user);
    if (!user) return null;

    const [energyReq, nutrientReqs, hydrationReq, userLocation] = await Promise.all([
      this.prisma.energyRequirement.findFirst({
        where: { 
          age: user.age,
          gender: user.gender
        }
      }),
      this.prisma.nutrientRequirement.findMany({
        where: {
          minAge: { lte: user.age },
          maxAge: { gte: user.age },
          OR: [
            { gender: user.gender },
            { gender: 'BOTH' }
          ]
        }
      }),
      this.prisma.hydrationRequirement.findFirst({
        where: {
          minAge: { lte: user.age },
          maxAge: { gte: user.age },
          gender: { in: [user.gender, 'BOTH'] },
        },
      }),
      user.locationId ? this.prisma.locationModifier.findUnique({
        where: { id: user.locationId }
      }) : Promise.resolve(null)
    ]);

    console.log(`[DailyLogService] Found energyReq:`, energyReq);
    console.log(`[DailyLogService] Found ${nutrientReqs.length} nutrientReqs`);

    const targets: any = { kcal: { target: 2000 } };
    
    // Calcular Energía
    if (energyReq) {
      let kcalPerKg = 0;
      if (user.age < 18) {
        kcalPerKg = (user.activityLevel === 'LIGERA' ? energyReq.light :
                    user.activityLevel === 'VIGOROSA' ? energyReq.vigorous :
                    energyReq.moderate) ?? energyReq.moderate;
      } else {
        const tmb = getTmbPerKg(user.age, user.gender, user.weight);
        const factor = user.activityLevel === 'LIGERA' ? 1.55 : 
                       user.activityLevel === 'VIGOROSA' ? 2.12 : 
                       1.82;
        kcalPerKg = tmb * factor;
      }
      console.log(`[DailyLogService] Energy calculation: age=${user.age}, level=${user.activityLevel}, kcalPerKg=${kcalPerKg}, weight=${user.weight}`);
      targets.kcal.target = kcalPerKg * user.weight;
    }

    // Calcular Hidratación
    if (hydrationReq) {
      const geoFactor = userLocation?.adjustmentFactor ?? 0;
      let activityAdjustment = 0;
      const activityLevel = user.activityLevel.toUpperCase();
      if (activityLevel === 'MODERADA') activityAdjustment = 1000;
      else if (activityLevel === 'VIGOROSA') activityAdjustment = 2000;

      targets.totalWater = {
        target: hydrationReq.totalWater_ml * (1 + geoFactor) + activityAdjustment,
        food_target: hydrationReq.foodWaterTarget_ml,
        fluid_target: hydrationReq.freeFluidTarget_ml
      };
    }

    // Calcular Nutrientes Detallados
    nutrientReqs.forEach(req => {
      let targetValue = 0;
      if (req.unit === 'g/kg/day') {
        targetValue = req.value * user.weight;
      } else if (req.unit === '%') {
        const caloriesPerGram = (req.nutrient === 'fat' || req.nutrient.toLowerCase().includes('fat')) ? 9 : 4;
        const totalKcal = targets.kcal.target;
        targetValue = (totalKcal * (req.value / 100)) / caloriesPerGram;
      } else {
        targetValue = req.value;
      }

      if (!targets[req.nutrient]) targets[req.nutrient] = {};
      targets[req.nutrient][req.type.toLowerCase()] = targetValue;
    });

    if (targets['fat'] && targets['polyunsaturatedFat'] && targets['saturatedFat']) {
      const fatMax = targets['fat'].amdr_max || targets['fat'].target || 0;
      const polyMax = targets['polyunsaturatedFat'].amdr_max || 0;
      const polyMin = targets['polyunsaturatedFat'].amdr_min || 0;
      const satMax = targets['saturatedFat'].amdr_max || targets['saturatedFat'].ul || 0;

      if (fatMax > 0) {
         targets['monounsaturatedFat'] = {
            amdr_min: Math.max(0, (targets['fat'].amdr_min || 0) - polyMax - satMax),
            amdr_max: Math.max(0, fatMax - polyMin)
         };
      }
    }

    console.log(`[DailyLogService] Final targets kcal:`, targets.kcal);
    console.log(`[DailyLogService] Final targets protein:`, targets.protein);
    
    return targets;
  }

  async deleteEntry(id: string) {
    return this.prisma.logEntry.delete({
      where: { id },
    });
  }

  private getEmptyTotals() {
    const totals: any = {};
    NUTRITION_KEYS.forEach(key => totals[key] = 0);
    return totals;
  }
}

function getTmbPerKg(age: number, gender: string, weight: number): number {
  if (age < 18) return 0;
  if (gender === 'M') {
    if (age >= 18 && age < 30) {
      if (weight <= 50) return 29;
      if (weight >= 90) return 23;
      if (weight < 70) return 29 - ((weight - 50) / 20) * 4;
      return 25 - ((weight - 70) / 20) * 2;
    } else if (age >= 30 && age < 60) {
      if (weight <= 50) return 29;
      if (weight >= 90) return 21;
      if (weight < 80) return 29 - ((weight - 50) / 30) * 7;
      return 22 - ((weight - 80) / 10) * 1;
    } else {
      if (weight <= 50) return 23;
      if (weight >= 90) return 18;
      if (weight < 60) return 23 - (weight - 50) * 0.1;
      if (weight < 70) return 22 - (weight - 60) * 0.2;
      return 20 - ((weight - 70) / 20) * 2;
    }
  } else {
    if (age >= 18 && age < 30) {
      if (weight <= 45) return 26;
      if (weight >= 85) return 21;
      if (weight < 65) return 26 - ((weight - 45) / 20) * 4;
      if (weight < 75) return 22 - ((weight - 65) / 10) * 1;
      return 21;
    } else if (age >= 30 && age < 60) {
      if (weight <= 45) return 27;
      if (weight >= 85) return 18;
      if (weight < 75) return 27 - ((weight - 45) / 30) * 8;
      return 19 - ((weight - 75) / 10) * 1;
    } else {
      if (weight <= 45) return 24;
      if (weight >= 85) return 17;
      if (weight < 70) return 24 - ((weight - 45) / 25) * 6;
      return 18 - ((weight - 70) / 15) * 1;
    }
  }
}

