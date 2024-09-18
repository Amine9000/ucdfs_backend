import { Module } from '@nestjs/common';
import { ModulesService } from './modules.service';
import { ModulesController } from './modules.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Unit } from './entities/unit.entity';
import { Etape } from 'src/etapes/entities/etape.entity';
import { EtapesModule } from 'src/etapes/etapes.module';
import { Student } from 'src/users/entities/students.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Unit, Etape, Student]), EtapesModule],
  controllers: [ModulesController],
  providers: [ModulesService],
  exports: [ModulesService],
})
export class ModulesModule {}
