import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { EtapesModule } from 'src/etapes/etapes.module';
import { ModulesModule } from 'src/modules/modules.module';
import { StudentsModule } from 'src/students/students.module';
import { StudentsFileService } from './students-file.service';

@Module({
  imports: [EtapesModule, ModulesModule, StudentsModule],
  controllers: [FilesController],
  providers: [FilesService, StudentsFileService],
})
export class FilesModule {}
