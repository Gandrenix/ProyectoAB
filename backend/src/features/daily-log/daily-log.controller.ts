import { Controller, Post, Body, Get, Param, Delete, Put, Query } from '@nestjs/common';
import { DailyLogService } from './daily-log.service';
import { InputType } from '@prisma/client';

class AddEntryDto {
  date: string; // YYYY-MM-DD
  userId: string;
  foodUisId?: number;
  foodIcbfId?: number;
  mealType: string;
  inputType: InputType;
  inputAmount: number;
}

@Controller('daily-log')
export class DailyLogController {
  constructor(private readonly dailyLogService: DailyLogService) {}

  @Post('entry')
  async addEntry(@Body() dto: AddEntryDto) {
    return this.dailyLogService.addEntry(dto);
  }

  @Get(':userId/:date')
  async getDailyLog(
    @Param('userId') userId: string,
    @Param('date') date: string,
  ) {
    return this.dailyLogService.getDailySummary(userId, date);
  }

  @Delete('entry/:id')
  async deleteEntry(@Param('id') id: string) {
    return this.dailyLogService.deleteEntry(id);
  }
}
