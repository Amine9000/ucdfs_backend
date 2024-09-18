import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { Service } from './entities/service.entity';
import { ServiceFields } from './entities/fields.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserServiceData } from './entities/user-service-data.entity';
import { UserService } from './entities/user-service.entity';
import { DemandesService } from './demandes.service';
import { DemandesController } from './demandes.controller';
import { Student } from 'src/users/entities/students.entity';
import { User } from 'src/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      User,
      Service,
      ServiceFields,
      UserService,
      UserServiceData,
    ]),
  ],
  controllers: [ServicesController, DemandesController],
  providers: [ServicesService, DemandesService],
})
export class ServicesModule {}
