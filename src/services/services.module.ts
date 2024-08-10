import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { Service } from './entities/service.entity';
import { ServiceFields } from './entities/fields.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Service, ServiceFields])],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
