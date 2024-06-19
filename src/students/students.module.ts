import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { Unit } from 'src/modules/entities/unit.entity';
import { ModulesModule } from 'src/modules/modules.module';
import { Etape } from 'src/etapes/entities/etape.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Unit, Etape]), ModulesModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
