import { Module } from '@nestjs/common';
import { EtapesService } from './etapes.service';
import { EtapesController } from './etapes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Etape } from './entities/etape.entity';
import { Unit } from 'src/modules/entities/unit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Etape, Unit])],
  controllers: [EtapesController],
  providers: [EtapesService],
})
export class EtapesModule {}
