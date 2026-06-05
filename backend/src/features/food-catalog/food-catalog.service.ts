import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FoodCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async searchFoods(query: string) {
    if (!query || query.length < 2) return [];

    return this.prisma.food.findMany({
      where: {
        name: {
          contains: query,
        },
      },
      take: 20,
    });
  }

  async getFoodById(id: number) {
    return this.prisma.food.findUnique({
      where: { id },
    });
  }
}
