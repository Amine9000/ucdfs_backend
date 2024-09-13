import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { Roles } from 'src/auth/Decorators/role.decorator';
import { ROLE } from 'src/auth/enums/Role.enum';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(ROLE.USERS_MANAGER, ROLE.Admin)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(ROLE.USERS_MANAGER, ROLE.Admin)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('search')
  @Roles(ROLE.USERS_MANAGER, ROLE.Admin)
  search(@Query('q') q: string) {
    return this.usersService.search(q);
  }

  @Get(':id')
  @Roles(ROLE.USERS_MANAGER, ROLE.Admin)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
  @Get(':email')
  @Roles(ROLE.USERS_MANAGER, ROLE.Admin)
  findOneByEmail(@Param('email') email: string) {
    return this.usersService.findOneByEmail(email);
  }

  @Patch(':id/change')
  changepwd(@Param('id') id: string, @Body('password') password: string) {
    return this.usersService.changepwd(id, password);
  }
  @Patch(':id/regenpwd')
  @Roles(ROLE.USERS_MANAGER, ROLE.Admin)
  regen(@Param('id') id: string) {
    return this.usersService.regen(id);
  }

  @Patch(':id')
  // u may need to remove this
  @Roles(ROLE.USERS_MANAGER, ROLE.Admin)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(ROLE.USERS_MANAGER, ROLE.Admin)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
