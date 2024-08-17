import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CreateDemandeDto } from './dto/create-demande.dto';
import { DemandesService } from './demandes.service';
import { UpdateDemandeDto } from './dto/update-demande.dto';

@Controller('demandes')
export class DemandesController {
  constructor(private readonly servicesService: DemandesService) {}

  @Post()
  createService(@Body() createServiceDto: CreateDemandeDto) {
    return this.servicesService.createDemande(createServiceDto);
  }

  @Get()
  findAllServices() {
    return this.servicesService.findAllDemandes();
  }

  @Get(':id')
  findOneService(@Param('id') id: string) {
    return this.servicesService.findOneDemande(id);
  }

  @Patch(':id')
  updateService(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateDemandeDto,
  ) {
    return this.servicesService.updateDemande(id, updateServiceDto);
  }

  @Delete(':id')
  removeService(@Param('id') id: string) {
    return this.servicesService.removeDemande(id);
  }
}
