import { Module } from '@nestjs/common';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { Unit } from 'src/modules/entities/unit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Student, Unit])],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
