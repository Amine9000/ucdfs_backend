import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  createService(@Body() createServiceDto: CreateServiceDto) {
    return this.servicesService.createService(createServiceDto);
  }

  @Get()
  findAllServices() {
    return this.servicesService.findAllServices();
  }

  @Get('service/:id')
  findOneService(@Param('id') id: string) {
    return this.servicesService.findOneService(id);
  }

  @Patch('service/:id')
  updateService(
    @Param('id') id: string,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return this.servicesService.updateService(id, updateServiceDto);
  }

  @Delete('service/:id')
  removeService(@Param('id') id: string) {
    return this.servicesService.removeService(id);
  }
}
