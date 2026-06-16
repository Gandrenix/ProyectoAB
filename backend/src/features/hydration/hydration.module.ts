import { Module } from '@nestjs/common';
import { HydrationController } from './hydration.controller';
import { HydrationService } from './hydration.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [HydrationController],
  providers: [HydrationService, PrismaService],
})
export class HydrationModule {}
