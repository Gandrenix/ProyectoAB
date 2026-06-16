import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { FoodCatalogModule } from './features/food-catalog/food-catalog.module';
import { DailyLogModule } from './features/daily-log/daily-log.module';
import { UserModule } from './features/user/user.module';
import { HydrationModule } from './features/hydration/hydration.module';

@Module({
  imports: [FoodCatalogModule, DailyLogModule, UserModule, HydrationModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
