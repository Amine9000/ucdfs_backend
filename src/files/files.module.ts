import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { EtapesModule } from 'src/etapes/etapes.module';
import { ModulesModule } from 'src/modules/modules.module';
import { StudentsModule } from 'src/students/students.module';
import { StudentsFileService } from './students-file.service';
import { PdfFileService } from './filebuilders/pdffile.service';
import { ExcelFileService } from './filebuilders/excelfile.service';
import { FileCreatorService } from './filecreator.service';

@Module({
  imports: [EtapesModule, ModulesModule, StudentsModule],
  controllers: [FilesController],
  providers: [
    FilesService,
    StudentsFileService,
    PdfFileService,
    ExcelFileService,
    FileCreatorService,
  ],
})
export class FilesModule {}
