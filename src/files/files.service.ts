import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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

@Injectable()
export class FilesService {
  constructor(
    private readonly etapesService: EtapesService,
    private readonly modulesService: ModulesService,
    private readonly studentsService: StudentsService,
  ) {}
  async create(file: Express.Multer.File) {
    const data = this.readFile(file.path);
    const etapes = this.getAllEtapes(data);
    const modules = this.getAllModulesByEtape(data);
    const students = this.groupModulesByName(data);
    await this.saveEtapes(etapes);
    await this.saveModules(modules);
    await this.saveStudents(students);
  }

  readFile(path: string): FileColumnsNames[] {
    const workbook = xlsx.readFile(path, { cellDates: true });
    const sheet = workbook.SheetNames[0];
    const data: FileColumnsNames[] = xlsx.utils.sheet_to_json(
      workbook.Sheets[sheet],
    );
    return data;
  }

  groupModulesByName(data: FileColumnsNames[]) {
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
      modules: Array.from(etd['modules']),
    }));
  }

  getAllModulesByEtape(data: FileColumnsNames[]) {
    const allModules: object[] = data.map((record) => ({
      etape_code: record['CODE_ETAPE'],
      module_code: record['COD_ELP'],
      module_name: record['LIB_ELP'],
    }));
    const modulesSets = {};
    const modules = new Set<string>();
    for (const mod of allModules) {
      const key = mod['etape_code'];
      if (!modulesSets[key]) {
        modulesSets[key] = [
          {
            module_code: mod['module_code'],
            module_name: mod['module_name'],
          },
        ];
      } else {
        if (!modules.has(mod['module_code'])) {
          modulesSets[key].push({
            module_code: mod['module_code'],
            module_name: mod['module_name'],
          });
          modules.add(mod['module_code']);
        }
      }
    }
    return modulesSets;
  }

  getAllEtapes(data: FileColumnsNames[]): CreateEtapeDto[] {
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

  async saveEtapes(etapes: CreateEtapeDto[]) {
    for (const etape of etapes) {
      await this.etapesService.create(etape);
    }
  }

  async saveModules(modules: Record<string, CreateModuleDto[]>) {
    const keys = Object.keys(modules);
    for (const key of keys) {
      for (const mod of modules[key]) {
        await this.modulesService.create({
          ...mod,
          etape_code: key,
        });
      }
    }
  }

  async saveStudents(students: CreateStudentDto[]) {
    for (const student of students) {
      await this.studentsService.create(student);
    }
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
      console.error(error.message);
    }
  }

  devideData(data: object[], groupNum: number) {
    // devide data

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

  async saveToFile(data: object[], path: string) {
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
