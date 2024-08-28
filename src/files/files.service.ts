import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { UpdateFileDto } from './dto/update-file.dto';
import * as xlsx from 'xlsx';
import { FileColumnsNames } from './types/FileColumnsNames';
import { CreateEtapeDto } from 'src/etapes/dto/create-etape.dto';
import { EtapesService } from 'src/etapes/etapes.service';
import { CreateModuleDto } from 'src/modules/dto/create-module.dto';
import { ModulesService } from 'src/modules/modules.service';
import { CreateStudentDto } from 'src/students/dto/create-student.dto';
import { StudentsService } from 'src/students/students.service';
import { join } from 'path';
import * as fs from 'fs';
import { v4 } from 'uuid';
import { archiveFolder } from 'zip-lib';
import { rimrafSync } from 'rimraf';
import * as passwordGenerator from 'generate-password';
import { StudentsFileService } from './students-file.service';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly etapesService: EtapesService,
    private readonly modulesService: ModulesService,
    private readonly studentsService: StudentsService,
    private readonly studentsFileService: StudentsFileService,
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
      this.logger.log(
        `The file has been processed in ${processingTime / 60000} minutes`,
      );
      const originalStudents = JSON.parse(JSON.stringify(students));
      return this.preparePasswordsFile(file, originalStudents);
    }
  }

  studentsFile(file: Express.Multer.File, modules: string[]) {
    return this.studentsFileService.store(file, modules);
  }

  async preparePasswordsFile(file: Express.Multer.File, students: any[]) {
    const dirPath = join(__dirname, '..', '..', '..', 'downloads');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }
    const fileName = file.filename + '-' + v4();

    const filePath = join(dirPath, fileName);

    // PREPARE STUDENTS DATA

    const studnets_file_data = students.map((student) => {
      return {
        code: student.student_code,
        Nom: student.student_lname,
        Prenom: student.student_fname,
        date_naissanse: new Date(student.student_birthdate).toLocaleDateString(
          'en-GB',
        ),
        cne: student.student_cne,
        cin: student.student_cin,
        password: student.student_pwd,
      };
    });

    await this.saveToFile(studnets_file_data, filePath);
    return filePath;
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
    this.logger.log('READING THE FILE.');
    const workbook = xlsx.readFile(path, { cellDates: true });
    const sheet = workbook.SheetNames[0];
    const data: FileColumnsNames[] = xlsx.utils.sheet_to_json(
      workbook.Sheets[sheet],
    );
    return data;
  }

  getStudents(data: FileColumnsNames[]) {
    this.logger.log('EXTRACTING STUDENTS FROM THE DATA.');
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
    this.logger.log('EXTRACTING MODULES FROM THE DATA.');
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
    this.logger.log('EXTRACTING ETAPES FROM THE DATA.');
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
        let key = COD_ELP;
        if (!etapeModuleSets[key]) {
          etapeModuleSets[key] = {
            module_code: COD_ELP,
            module_name: LIB_ELP,
            etape_codes: [CODE_ETAPE],
          };
        } else {
          if (!etapeModuleSets[key].etape_codes.includes(CODE_ETAPE))
            etapeModuleSets[key].etape_codes.push(CODE_ETAPE);
        }

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
          groupedData[key]['modules'] = new Set<string>();
        }
        groupedData[key]['modules'].add(COD_ELP);
      },
    );

    const students = Object.values(groupedData).map((etd) => {
      const std = {
        ...etd,
        student_pwd: '',
        modules: Array.from(etd['modules']),
      };
      return std;
    });

    return [etapes, Object.values(etapeModuleSets), students];
  }

  async saveEtapes(etapes: CreateEtapeDto[]) {
    this.logger.log('SAVING ETAPES TO THE DATABASE.');
    await this.etapesService.createBulk(etapes);
  }

  async saveModules(modules: CreateModuleDto[]) {
    this.logger.log('SAVING MODULES TO THE DATABASE.');
    await this.modulesService.createBulk(modules);
  }

  async saveStudents(students: CreateStudentDto[]) {
    this.logger.log('SAVING STUDENTS TO THE DATABASE.');
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

  async getStudentsValidationFiles(etape_code: string, groupNum: number) {
    const data = await this.etapesService.studentsValidationByEtape(etape_code);

    // groups number validation
    if (groupNum == 0)
      return new HttpException(
        'number of groups is Zero.',
        HttpStatus.BAD_REQUEST,
      );

    if (groupNum > data.length)
      return new HttpException(
        'number of groups is greater than number of studnets.',
        HttpStatus.BAD_REQUEST,
      );

    const groups = this.devideData(data, groupNum);

    const zipPath = this.saveGroupsAsZipFile(groups, etape_code);
    return zipPath;
  }

  async saveGroupsAsZipFile(groups: any[], etape_code: string) {
    const dirPath = join(__dirname, '..', '..', '..', 'downloads');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }
    const tempDirName = v4();
    const temDirPath = join(dirPath, tempDirName);

    if (!fs.existsSync(temDirPath)) {
      fs.mkdirSync(temDirPath);
    }
    groups.forEach(async (group: any[], index) => {
      const fileName = etape_code + '-group-' + (index + 1) + '.xlsx';

      const filePath = join(temDirPath, fileName);
      await this.saveToFile(group, filePath);
    });
    const zipPath = join(dirPath, tempDirName + '.zip');
    await this.zipDir(temDirPath, zipPath);

    // remove temp dir
    if (fs.existsSync(temDirPath)) {
      rimrafSync(temDirPath);
    }
    return zipPath;
  }

  async zipDir(temDirPath: string, zipPath: string) {
    try {
      await archiveFolder(temDirPath, zipPath);
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  devideData(data: object[], groupNum: number) {
    let start = 0;
    const groupLength = Math.ceil(data.length / groupNum);
    const groups = [];
    for (let i = 0; i < groupNum; i++) {
      let end = start + groupLength;
      if (end > data.length) end = data.length;
      groups.push(data.slice(start, end));
      start = end;
    }
    return groups;
  }

  async getStudentsValidationFilesByEtapes(
    etape_codes: string[],
    groupNum: number,
  ) {
    const data = [];

    for (let i = 0; i < etape_codes.length; i++) {
      const etape_code = etape_codes[i];
      data.push(
        ...(await this.etapesService.studentsValidationByEtape(etape_code)),
      );
    }

    // groups number validation
    if (groupNum == 0)
      return new HttpException(
        'number of groups is Zero.',
        HttpStatus.BAD_REQUEST,
      );

    if (groupNum > data.length)
      return new HttpException(
        'number of groups is greater than number of studnets.',
        HttpStatus.BAD_REQUEST,
      );

    const groups = this.devideData(data, groupNum);

    const zipPath = this.saveGroupsAsZipFile(groups, etape_codes.join('-'));
    return zipPath;
  }

  async saveToFile(data: object[], path: string) {
    // fill empty cells
    data = data.map((row) => {
      const newRow = {};
      for (const key in row) {
        newRow[key] = row[key] || '--';
      }
      return newRow;
    });
    // Convert JSON to worksheet
    const worksheet = xlsx.utils.json_to_sheet(data);

    // Create a new workbook and append the worksheet
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Write the workbook to a file
    xlsx.writeFile(workbook, path);
  }

  findAll() {
    return `This action returns all files`;
  }

  findOne(id: number) {
    return `This action returns a #${id} file`;
  }

  update(id: number, updateFileDto: UpdateFileDto) {
    return { id, updateFileDto };
  }

  remove(id: number) {
    return `This action removes a #${id} file`;
  }
}
