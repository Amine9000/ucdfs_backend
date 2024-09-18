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
  constructor(private readonly demandeService: DemandesService) {}

  @Post()
  createService(@Body() createServiceDto: CreateDemandeDto) {
    return this.demandeService.createDemande(createServiceDto);
  }

  @Get()
  findAllServices() {
    return this.demandeService.findAllDemandes();
  }

  @Get(':id')
  findOneDemandeBystdID(@Param('id') id: string) {
    return this.demandeService.findAllDemandesByStdID(id);
  }

  @Get(':id')
  findOneService(@Param('id') id: string) {
    return this.demandeService.findOneDemande(id);
  }

  @Patch(':id')
  updateService(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateDemandeDto,
  ) {
    return this.demandeService.updateDemande(id, updateServiceDto);
  }

  @Delete(':id')
  removeService(@Param('id') id: string) {
    return this.demandeService.removeDemande(id);
  }
}
