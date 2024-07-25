import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ModulesService } from './modules.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@Controller('modules')
@UseGuards(AuthGuard, RolesGuard)
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Post()
  create(@Body() createModuleDto: CreateModuleDto) {
    return this.modulesService.create(createModuleDto);
  }

  @Get()
  findAll() {
    return this.modulesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.modulesService.findOne(+id);
  }

  @Get('/all/:etape_code')
  findBySemester(@Param('etape_code') etape_code: string) {
    return this.modulesService.findBySemester(etape_code);
  }

  @Patch(':id')
  update(
    @Param('id') module_code: string,
    @Body() updateModuleDto: UpdateModuleDto,
  ) {
    return this.modulesService.update(module_code, updateModuleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.modulesService.remove(+id);
  }
}
