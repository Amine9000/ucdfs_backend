import { Injectable, Logger } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { FileColumnsNames } from './types/FileColumnsNames';
import { CreateEtapeDto } from 'src/etapes/dto/create-etape.dto';
import { EtapesService } from 'src/etapes/etapes.service';
import { CreateModuleDto } from 'src/modules/dto/create-module.dto';
import { ModulesService } from 'src/modules/modules.service';
import { CreateStudentDto } from 'src/students/dto/create-student.dto';
import { StudentsService } from 'src/students/students.service';
import * as fs from 'fs';
import * as passwordGenerator from 'generate-password';
import { StudentsFileService } from './students-file.service';
import { FileCreatorService } from './filecreator.service';
import { PdfFileService } from './filebuilders/pdffile.service';
import { ExcelFileService } from './filebuilders/excelfile.service';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly etapesService: EtapesService,
    private readonly modulesService: ModulesService,
    private readonly studentsService: StudentsService,
    private readonly studentsFileService: StudentsFileService,
    private readonly filecreatorService: FileCreatorService,
    private readonly pdfFileService: PdfFileService,
    private readonly excelFileService: ExcelFileService,
  ) {}
  async create(file: Express.Multer.File) {
    if (file) {
      const startTime = Date.now();

      const data = this.readFile(file.path);
      const [etapes, modules, students] = this.getAllData(data);
      await this.saveEtapes(etapes);
      await this.saveModules(modules);
      await this.saveStudents(students);
      await this.deleteFile(file.path);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // log time in minutes
      this.logger.verbose(
        `The file has been processed in ${processingTime / 60000} minutes`,
      );
      return students;
    }
  }

  async studentsFile(
    file: Express.Multer.File,
    modules: { module_code: string; etape_code: string }[],
  ) {
    const data = await this.studentsFileService.store(file, modules);
    this.logger.verbose('PROCCESS ENDED');
    return data;
  }

  async deleteFile(path: string) {
    if (fs.existsSync(path)) {
      fs.unlink(path, (err) => {
        if (err) {
          this.logger.error(err.message);
        }
      });
    }
  }

  readFile(path: string): FileColumnsNames[] {
    this.logger.verbose('READING THE FILE.');
    const workbook = xlsx.readFile(path, { cellDates: true });
    const sheet = workbook.SheetNames[0];
    const data: FileColumnsNames[] = xlsx.utils.sheet_to_json(
      workbook.Sheets[sheet],
    );
    return data;
  }

  getStudents(data: FileColumnsNames[]) {
    this.logger.verbose('EXTRACTING STUDENTS FROM THE DATA.');
    const groupedData: Record<string, any> = {};
    for (const record of data) {
      if (record) {
        const { COD_ELP, ...rest } = record;
        delete rest['LIB_ELP'];
        delete rest['VERSION_ETAPE'];
        delete rest['CODE_ETAPE'];
        const key = record['CNE'] + '-' + record['CIN'];
        if (!groupedData[key]) {
          groupedData[key] = {
            student_code: rest['CODE_ETUDIANT'],
            student_fname: rest['PRENOM'],
            student_lname: rest['NOM'],
            student_cne: rest['CNE'],
            student_cin: rest['CIN'],
            student_birthdate: rest['DATE_NAISSANCE'],
          };
          groupedData[key]['modules'] = new Set<string>();
        }
        groupedData[key]['modules'].add(COD_ELP);
      }
    }
    return Object.values(groupedData).map((etd) => ({
      ...etd,
      student_pwd: passwordGenerator.generate({
        length: 10,
        numbers: true,
      }),
      modules: Array.from(etd['modules']),
    }));
  }

  getAllModulesByEtape(data: FileColumnsNames[]) {
    this.logger.verbose('EXTRACTING MODULES FROM THE DATA.');
    const allModules: object[] = data.map((record) => ({
      etape_code: record['CODE_ETAPE'],
      module_code: record['COD_ELP'],
      module_name: record['LIB_ELP'],
    }));
    const etapesSet = {};
    const moduleEtapeCodesSet = new Set<string>();
    for (let i = 0; i < allModules.length; i++) {
      const mod = allModules[i];
      const key = mod['etape_code'];
      if (!etapesSet[key]) {
        etapesSet[key] = [];
      }
      if (!moduleEtapeCodesSet.has(key + '-' + mod['module_code'])) {
        etapesSet[key].push({
          module_code: mod['module_code'],
          module_name: mod['module_name'],
        });
        moduleEtapeCodesSet.add(key + '-' + mod['module_code']);
      }
    }
    return etapesSet;
  }

  getAllEtapes(data: FileColumnsNames[]): CreateEtapeDto[] {
    this.logger.verbose('EXTRACTING ETAPES FROM THE DATA.');
    const etapesSet = new Set<string>();
    const etapes: CreateEtapeDto[] = [];
    data.forEach((record) => {
      if (!etapesSet.has(record['CODE_ETAPE'])) {
        etapes.push({
          etape_code: record['CODE_ETAPE'],
          etape_name: record['VERSION_ETAPE'],
        });
        etapesSet.add(record['CODE_ETAPE']);
      }
    });
    return etapes;
  }

  getAllData(data: FileColumnsNames[]): [any, any, any] {
    const etapesSet = new Set<string>();
    const etapes: CreateEtapeDto[] = [];

    const etapeModuleSets = {};

    const groupedData: Record<string, any> = {};

    data.forEach(
      ({
        CODE_ETAPE,
        VERSION_ETAPE,
        COD_ELP,
        LIB_ELP,
        CNE,
        CIN,
        PRENOM,
        NOM,
        DATE_NAISSANCE,
        CODE_ETUDIANT,
      }) => {
        // etapes
        if (!etapesSet.has(CODE_ETAPE)) {
          etapes.push({
            etape_code: CODE_ETAPE,
            etape_name: VERSION_ETAPE,
          });
          etapesSet.add(CODE_ETAPE);
        }

        // modules
        let key = COD_ELP + '-' + CODE_ETAPE;
        etapeModuleSets[key] = {
          module_code: COD_ELP,
          module_name: LIB_ELP,
          etape_code: CODE_ETAPE,
        };

        // students

        key = CNE + '-' + (CIN ?? '');
        if (!groupedData[key]) {
          groupedData[key] = {
            student_code: CODE_ETUDIANT,
            student_fname: PRENOM,
            student_lname: NOM,
            student_cne: CNE,
            student_cin: CIN,
            student_birthdate: DATE_NAISSANCE,
          };
          groupedData[key]['modules'] = new Map();
        }
        const obj = {
          module_code: COD_ELP,
          etape_code: CODE_ETAPE,
        };

        groupedData[key]['modules'].set(JSON.stringify(obj), obj);
      },
    );

    const students = Object.values(groupedData).map((etd) => {
      const std = {
        ...etd,
        student_pwd: '',
        modules: Array.from(etd['modules'].values()),
      };
      return std;
    });

    return [etapes, Object.values(etapeModuleSets), students];
  }

  async saveEtapes(etapes: CreateEtapeDto[]) {
    this.logger.verbose('SAVING ETAPES TO THE DATABASE.');
    await this.etapesService.createBulk(etapes);
  }

  async saveModules(modules: CreateModuleDto[]) {
    this.logger.verbose('SAVING MODULES TO THE DATABASE.');
    await this.modulesService.createBulk(modules);
  }

  async saveStudents(students: CreateStudentDto[]) {
    this.logger.verbose('SAVING STUDENTS TO THE DATABASE.');
    const entities = await Promise.all(
      students.map(async (std) => {
        std.student_pwd = std.student_cne + '@' + std.student_cin;
        return {
          ...std,
          student_pwd: std.student_pwd,
        };
      }),
    );
    await this.studentsService.createBulk(entities);
  }

  async getStudentsValidationPdfFiles(
    etape_id: string,
    groupNum: number,
    sectionsNbr: number,
    session: string,
  ) {
    this.filecreatorService.setBuilder(this.pdfFileService);
    const { studentsData: data, etapeName } =
      await this.etapesService.studentsValidationByEtape(etape_id);
    return this.filecreatorService.create(
      data,
      etapeName,
      groupNum,
      sectionsNbr,
      session,
    );
  }
  async getStudentsValidationExcelFiles(
    etape_id: string,
    groupNum: number,
    sectionsNbr: number,
    session: string,
  ) {
    this.filecreatorService.setBuilder(this.excelFileService);
    const { studentsData: data, etapeName } =
      await this.etapesService.studentsValidationByEtape(etape_id);
    return this.filecreatorService.create(
      data,
      etapeName,
      groupNum,
      sectionsNbr,
      session,
    );
  }
}
