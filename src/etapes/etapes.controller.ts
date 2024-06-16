import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
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
  findAll() {
    return this.etapesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.etapesService.findOne(+id);
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
