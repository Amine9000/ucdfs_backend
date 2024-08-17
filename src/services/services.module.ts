import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { Service } from './entities/service.entity';
import { ServiceFields } from './entities/fields.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentServiceData } from './entities/student-service-data.entity';
import { StudentService } from './entities/student-service.entity';
import { DemandesService } from './demandes.service';
import { DemandesController } from './demandes.controller';
import { Student } from 'src/students/entities/student.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      Service,
      ServiceFields,
      StudentService,
      StudentServiceData,
    ]),
  ],
  controllers: [ServicesController, DemandesController],
  providers: [ServicesService, DemandesService],
})
export class ServicesModule {}
