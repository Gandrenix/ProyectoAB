import { Module } from '@nestjs/common';
import { FoodCatalogController } from './food-catalog.controller';
import { FoodCatalogService } from './food-catalog.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [FoodCatalogController],
  providers: [FoodCatalogService, PrismaService],
})
export class FoodCatalogModule {}
