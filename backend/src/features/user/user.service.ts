import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async updateUser(id: string, data: any) {
    return this.prisma.user.upsert({
      where: { id },
      update: data,
      create: {
        id,
        ...data,
      },
    });
  }
}
