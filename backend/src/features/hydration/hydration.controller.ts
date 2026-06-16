import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { HydrationService } from './hydration.service';

@Controller('hydration')
export class HydrationController {
  constructor(private readonly hydrationService: HydrationService) {}

  @Get('goal/:userId')
  async getGoal(@Param('userId') userId: string) {
    return this.hydrationService.getHydrationGoal(userId);
  }

  @Get('locations')
  async getLocations() {
    return this.hydrationService.getAllLocations();
  }

  @Post('intake')
  async updateIntake(
    @Body() dto: { userId: string; date: string; amount_ml: number },
  ) {
    return this.hydrationService.updateWaterIntake(dto.userId, dto.date, dto.amount_ml);
  }
}
