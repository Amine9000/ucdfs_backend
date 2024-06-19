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
} from '@nestjs/common';
import { EtapesService } from './etapes.service';
import { CreateEtapeDto } from './dto/create-etape.dto';
import { UpdateEtapeDto } from './dto/update-etape.dto';

@Controller('etapes')
export class EtapesController {
  constructor(private readonly etapesService: EtapesService) {}

  @Post()
  create(@Body() createEtapeDto: CreateEtapeDto) {
    return this.etapesService.create(createEtapeDto);
  }

  @Get()
  findAll(
    @Query('skip', ParseIntPipe) skip: number,
    @Query('take', ParseIntPipe) take: number,
  ) {
    return this.etapesService.findAll(skip, take);
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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.etapesService.remove(+id);
  }
}
