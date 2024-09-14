import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ModulesService } from './modules.service';
import { CreateModuleEtapesDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { EtapesService } from 'src/etapes/etapes.service';

@Controller('modules')
@UseGuards(AuthGuard, RolesGuard)
export class ModulesController {
  private readonly logger = new Logger(ModulesController.name);
  constructor(
    private readonly modulesService: ModulesService,
    private readonly etapesService: EtapesService,
  ) {}

  @Post()
  create(@Body() createModuleDto: CreateModuleEtapesDto) {
    return this.modulesService.create(createModuleDto);
  }

  @Get()
  findAll() {
    return this.modulesService.findAll();
  }

  @Post('merge')
  mergeBranches(
    @Body('etape_codes') etape_codes: string[],
    @Body('branchName') branchName: string,
    @Body('codeBranch') codeBranch: string,
  ) {
    return this.modulesService.mergeBranches(
      etape_codes,
      branchName,
      codeBranch,
    );
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

  @Delete('clear')
  clearModulesTable() {
    this.logger.verbose('Clearing modules table', ModulesController.name);
    this.modulesService.clearModulesTable();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.modulesService.remove(+id);
  }
}
