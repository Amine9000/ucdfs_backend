import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Unit } from 'src/modules/entities/unit.entity';
import { ModulesModule } from 'src/modules/modules.module';
import { Etape } from 'src/etapes/entities/etape.entity';
import { Student } from 'src/users/entities/students.entity';
import { User } from 'src/users/entities/user.entity';
import { RolesModule } from 'src/roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Student, Unit, Etape, User]),
    ModulesModule,
    RolesModule,
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
