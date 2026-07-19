import { Controller, Get, Query } from '@nestjs/common';
import { FoodCatalogService } from './food-catalog.service';

@Controller('foods')
export class FoodCatalogController {
  constructor(private readonly foodCatalogService: FoodCatalogService) {}

  @Get('search')
  async search(@Query('q') query: string, @Query('source') source: string) {
    return this.foodCatalogService.searchFoods(query, source);
  }

  @Get(':id')
  async getById(@Query('id') id: string, @Query('source') source: string) {
    return this.foodCatalogService.getFoodById(Number(id), source);
  }
}
