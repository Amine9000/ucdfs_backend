import { Module } from '@nestjs/common';
import { EtapesService } from './etapes.service';
import { EtapesController } from './etapes.controller';

@Module({
  controllers: [EtapesController],
  providers: [EtapesService],
})
export class EtapesModule {}
