import { Module } from '@nestjs/common';
import { ModulesService } from './modules.service';
import { ModulesController } from './modules.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Unit } from './entities/unit.entity';
import { Etape } from 'src/etapes/entities/etape.entity';
import { Student } from 'src/students/entities/student.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Unit, Etape, Student])],
  controllers: [ModulesController],
  providers: [ModulesService],
})
export class ModulesModule {}
