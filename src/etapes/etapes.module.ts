import { Module } from '@nestjs/common';
import { EtapesService } from './etapes.service';
import { EtapesController } from './etapes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Etape } from './entities/etape.entity';
import { Unit } from 'src/modules/entities/unit.entity';
import { Student } from 'src/users/entities/students.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Etape, Unit, Student])],
  controllers: [EtapesController],
  providers: [EtapesService],
  exports: [EtapesService],
})
export class EtapesModule {}
