import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InputType, Food } from '@prisma/client';

const NUTRITION_KEYS = [
  'kcal', 'carbs', 'protein', 'fat', 
  'saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat', 'cholesterol',
  'solubleFiber', 'insolubleFiber', 'totalFiber',
  'calcium', 'phosphorus', 'sodium', 'potassium', 'magnesium',
  'iron', 'zinc', 'copper', 'manganese', 'selenium',
  'vitE', 'vitK', 'vitD', 'vitA',
  'vitB1', 'vitB2', 'vitB3', 'vitB5', 'vitB6', 'vitB9', 'vitB12', 'vitC'
];

@Injectable()
export class DailyLogService {
  constructor(private readonly prisma: PrismaService) {}

  async addEntry(dto: {
    date: string;
    userId: string;
    foodId: number;
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
        foodId: dto.foodId,
        mealType: dto.mealType,
        inputType: dto.inputType,
        inputAmount: dto.inputAmount,
      },
      include: {
        food: true,
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
              food: true,
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
      const factor =
        entry.inputType === InputType.HOUSEHOLD
          ? entry.inputAmount
          : entry.inputAmount / entry.food.baseAmount;

      const calculated: any = {};
      NUTRITION_KEYS.forEach(key => {
        const val = (entry.food as any)[key] ?? 0;
        calculated[key] = val * factor;
      });

      return {
        ...entry,
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
      totals,
      targets: await this.calculateTargets(user),
      user
    };
  }

  private async calculateTargets(user: any) {
    console.log(`[DailyLogService] calculateTargets called for user:`, user);
    if (!user) return null;

    const [energyReq, nutrientReqs] = await Promise.all([
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
      })
    ]);

    console.log(`[DailyLogService] Found energyReq:`, energyReq);
    console.log(`[DailyLogService] Found ${nutrientReqs.length} nutrientReqs`);

    const targets: any = { kcal: { target: 2000 } };
    
    // Calcular Energía
    if (energyReq) {
      const kcalPerKg = user.activityLevel === 'LIGERA' ? energyReq.light :
                        user.activityLevel === 'VIGOROSA' ? energyReq.vigorous :
                        energyReq.moderate;
      console.log(`[DailyLogService] Energy calculation: level=${user.activityLevel}, kcalPerKg=${kcalPerKg}, weight=${user.weight}`);
      targets.kcal.target = (kcalPerKg || energyReq.moderate) * user.weight;
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
