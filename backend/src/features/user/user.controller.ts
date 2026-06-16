import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UserService } from './user.service';

class UpdateUserDto {
  name?: string;
  age: number;
  gender: string;
  weight: number;
  activityLevel: string;
  locationId?: string;
}

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  async getUser(@Param('id') id: string) {
    console.log(`[UserController] Getting user ${id}`);
    return this.userService.getUser(id);
  }

  @Post(':id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    console.log(`[UserController] Updating user ${id} with data:`, dto);
    const result = await this.userService.updateUser(id, dto);
    console.log(`[UserController] Update result:`, result);
    return result;
  }
}
