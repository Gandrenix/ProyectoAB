import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HydrationService {
  constructor(private readonly prisma: PrismaService) {}

  async getHydrationGoal(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { location: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const req = await this.prisma.hydrationRequirement.findFirst({
      where: {
        minAge: { lte: user.age },
        maxAge: { gte: user.age },
        gender: { in: [user.gender, 'BOTH'] },
      },
    });

    if (!req) {
      throw new NotFoundException(`No hydration requirements found for age ${user.age} and gender ${user.gender}`);
    }

    const geoFactor = user.location?.adjustmentFactor ?? 0;

    let activityAdjustment = 0;
    const activityLevel = user.activityLevel.toUpperCase();
    if (activityLevel === 'MODERADA') {
      activityAdjustment = 1000;
    } else if (activityLevel === 'VIGOROSA') {
      activityAdjustment = 2000;
    }

    const calculatedTotalGoal = req.totalWater_ml * (1 + geoFactor) + activityAdjustment;

    return {
      userId: user.id,
      basalTotalWater_ml: req.totalWater_ml,
      geoAdjustment_ml: req.totalWater_ml * geoFactor,
      activityAdjustment_ml: activityAdjustment,
      calculatedTotalGoal_ml: calculatedTotalGoal,
      foodWaterTarget_ml: req.foodWaterTarget_ml,
      freeFluidTarget_ml: req.freeFluidTarget_ml,
    };
  }

  async updateWaterIntake(userId: string, date: string, amount_ml: number) {
    const dateObj = new Date(date);
    
    let dailyLog = await this.prisma.dailyLog.findUnique({
      where: {
        date_userId: {
          date: dateObj,
          userId: userId,
        },
      },
    });

    if (!dailyLog) {
      dailyLog = await this.prisma.dailyLog.create({
        data: {
          date: dateObj,
          userId: userId,
          waterIntake_ml: amount_ml,
        },
      });
    } else {
      dailyLog = await this.prisma.dailyLog.update({
        where: { id: dailyLog.id },
        data: { waterIntake_ml: amount_ml },
      });
    }

    return dailyLog;
  }

  async getAllLocations() {
    return this.prisma.locationModifier.findMany({
      orderBy: { city: 'asc' },
    });
  }
}
