import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { EtapesService } from './etapes.service';
import { CreateEtapeDto } from './dto/create-etape.dto';
import { UpdateEtapeDto } from './dto/update-etape.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Role } from 'src/auth/enums/Role.enum';
import { Roles } from 'src/auth/Decorators/role.decorator';

@Controller('etapes')
@UseGuards(AuthGuard, RolesGuard)
export class EtapesController {
  constructor(private readonly etapesService: EtapesService) {}

  @Post()
  create(@Body() createEtapeDto: CreateEtapeDto) {
    return this.etapesService.create(createEtapeDto);
  }

  @Roles(Role.Admin)
  @Get('all')
  findAllEtapes() {
    return this.etapesService.findAllEtapes();
  }

  @Get()
  findAll(
    @Query('skip', ParseIntPipe) skip: number,
    @Query('take', ParseIntPipe) take: number,
  ) {
    return this.etapesService.findAll(skip, take);
  }

  @Get('search')
  async search(
    @Query('q') search_query: string,
    @Query('skip', ParseIntPipe) skip: number,
    @Query('take', ParseIntPipe) take: number,
  ) {
    const data = await this.etapesService.search(search_query, skip, take);
    return data;
  }

  @Get(':etape_code')
  findOne(@Param('etape_code') etape_code: string) {
    return this.etapesService.findOne(etape_code);
  }

  @Get(':etape_code/validation')
  studentsValidationByEtape(@Param('etape_code') etape_code: string) {
    return this.etapesService.studentsValidationByEtape(etape_code);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEtapeDto: UpdateEtapeDto) {
    return this.etapesService.update(+id, updateEtapeDto);
  }

  @Delete(':etape_code')
  remove(@Param('etape_code') etape_code: string) {
    return this.etapesService.remove(etape_code);
  }
}
