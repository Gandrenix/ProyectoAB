import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FoodCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async searchFoods(query: string, source: string = 'UIS') {
    if (!query || query.length < 2) return [];

    if (source === 'ICBF') {
      return this.prisma.foodIcbf.findMany({
        where: {
          name: {
            contains: query,
          },
        },
        take: 20,
      });
    }

    return this.prisma.foodUis.findMany({
      where: {
        name: {
          contains: query,
        },
      },
      take: 20,
    });
  }

  async getFoodById(id: number, source: string = 'UIS') {
    if (source === 'ICBF') {
      return this.prisma.foodIcbf.findUnique({
        where: { id },
      });
    }
    
    return this.prisma.foodUis.findUnique({
      where: { id },
    });
  }
}
