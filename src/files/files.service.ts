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
import PDFDocument from 'pdfkit';

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
      this.logger.verbose(
        `The file has been processed in ${processingTime / 60000} minutes`,
      );
      const originalStudents = JSON.parse(JSON.stringify(students));
      return this.preparePasswordsFile(file, originalStudents);
    }
  }

  studentsFile(
    file: Express.Multer.File,
    modules: { module_code: string; etape_code: string }[],
  ) {
    const data = this.studentsFileService.store(file, modules);
    this.logger.verbose('PROCCESS ENDED');
    return this.preparePasswordsFile(file, data);
  }

  async preparePasswordsFile(file: Express.Multer.File, students: any[]) {
    const dirPath = join(__dirname, '..', '..', '..', 'downloads');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }
    const fileName = file.filename + '-' + v4() + '.xlsx';

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

    await this.saveToFile(studnets_file_data, filePath, 'excel');
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

  async getStudentsValidationFiles(
    etape_code: string,
    groupNum: number,
    outputType: string,
  ) {
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

    const zipPath = this.saveGroupsAsZipFile(groups, etape_code, outputType);
    return zipPath;
  }

  async saveGroupsAsZipFile(
    groups: any[],
    etape_code: string,
    outputType: string,
  ) {
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
      const fileName =
        etape_code +
        '-group-' +
        (index + 1) +
        (outputType == 'excel' ? '.xlsx' : '.pdf');

      const filePath = join(temDirPath, fileName);
      await this.saveToFile(group, filePath, outputType);
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
      const piece = data.slice(start, end);
      groups.push(piece);
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

    const zipPath = this.saveGroupsAsZipFile(
      groups,
      etape_codes.join('-'),
      'excel',
    );
    return zipPath;
  }

  async saveToExcelFile(data: object[], path: string) {
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

  saveToPdfFile(data: object[], path: string) {
    const width = 595; // A4 width in points
    const height = 842; // A4 height in points
    const margins = { top: 50, bottom: 50, left: 50, right: 50 };

    // Create a new PDF document
    const doc = new PDFDocument({
      size: [width, height],
      margins: {
        top: margins.top,
        bottom: margins.bottom,
        left: margins.left,
        right: margins.right,
      },
    });

    // Pipe the document to a writable stream
    const writeStream = fs.createWriteStream(path);
    doc.pipe(writeStream);
    const fontBold = join(__dirname, '..', '..', 'public', 'fonts/bold.otf');
    const fontMedium = join(
      __dirname,
      '..',
      '..',
      'public',
      'fonts/medium.otf',
    );
    const fontLight = join(__dirname, '..', '..', 'public', 'fonts/light.otf');
    doc.registerFont('Bold', fontBold);
    doc.registerFont('medium', fontMedium);
    doc.registerFont('light', fontLight);

    function header() {
      // Add text to the document
      doc.font('Bold').fontSize(12).text("l'Université Chouaïb Doukkali", {
        characterSpacing: 1,
      });
      doc.font('Bold').fontSize(12).text('Faculté des Sciences', {
        characterSpacing: 1,
      });
      doc.font('Bold').fontSize(12).text("d'El Jadida", {
        characterSpacing: 1,
      });
      const group = 'Group 1';
      const textWidth = doc.widthOfString(group, {
        characterSpacing: 1,
      });
      doc
        .font('Bold')
        .fontSize(12)
        .text(group, width / 2 - textWidth / 2);
    }
    header();

    // Table headers
    const headers = Object.keys(data[0]);
    const startX = margins.left;
    let currentY = margins.top + 100;
    const gap = 1;
    const columnWidth =
      (width - margins.left - margins.right - (headers.length - 1) * gap) /
      headers.length;
    const numRowsPerPage = 30;
    const numPages = Math.ceil(data.length / numRowsPerPage);
    const rowHeight = 18;
    const numeroWidth = 30;
    const paddings = {
      left: 2,
      top: 2,
    };

    function alignItem(key: string) {
      if (key == 'Prenom' || key == 'Nom') {
        return 'left';
      } else {
        return 'center';
      }
    }
    function getWidth(key: string) {
      if (key == 'Numero') {
        return numeroWidth;
      } else if (key == 'Nom' || key == 'Prenom') {
        return columnWidth + (columnWidth - numeroWidth) / 2;
      } else {
        return columnWidth;
      }
    }
    function jump(lastheader: string) {
      if (lastheader === '') return 0;
      if (lastheader == 'Numero') {
        return numeroWidth + gap;
      } else if (lastheader == 'Nom' || lastheader == 'Prenom') {
        return columnWidth + (columnWidth - numeroWidth) / 2 + gap;
      } else {
        return columnWidth + gap;
      }
    }

    for (let i = 0; i < numPages; i++) {
      if (i > 0) {
        doc.addPage();
        header();
        currentY = margins.top + 100;
      }
      let lastheader = '';
      let currentX = 0;
      headers.forEach((header) => {
        currentX += jump(lastheader);
        doc
          .rect(startX + currentX, currentY, getWidth(header), rowHeight)
          .fill('lightgray')
          .stroke();
        doc
          .fontSize(8)
          .font('medium')
          .fillColor('black')
          .text(
            header == 'Numero' ? 'Nr' : header,
            startX + currentX + paddings.left,
            currentY + paddings.top,
            {
              width: getWidth(header),
              height: rowHeight,
              align: alignItem(header),
              lineBreak: false,
              ellipsis: true,
              characterSpacing: 1,
            },
          );
        lastheader = header;
      });

      currentY += rowHeight;

      doc
        .moveTo(startX, currentY)
        .lineTo(
          startX + headers.length * columnWidth + (headers.length - 1) * gap,
          currentY,
        )
        .stroke();
      data
        .slice(i * numRowsPerPage, (i + 1) * numRowsPerPage)
        .forEach((row) => {
          currentX = 0;
          lastheader = '';
          headers.forEach((header) => {
            currentX += jump(lastheader);
            doc
              .rect(startX + currentX, currentY, getWidth(header), rowHeight)
              .fill('lightgray') // Fill color for the cell background
              .stroke();
            doc
              .fontSize(8)
              .font('light')
              .fillColor('black')
              .text(
                String(row[header]),
                startX + currentX + paddings.left,
                currentY + paddings.top,
                {
                  width: getWidth(header),
                  height: rowHeight,
                  align: alignItem(header),
                  lineBreak: false,
                  ellipsis: true,
                  characterSpacing: 1,
                },
              );
            lastheader = header;
          });
          currentY += rowHeight;

          doc
            .moveTo(startX, currentY)
            .lineTo(startX + headers.length * columnWidth, currentY)
            .stroke();
        });
    }

    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  async saveToFile(data: object[], path: string, outputType: string) {
    if (outputType == 'excel') this.saveToExcelFile(data, path);
    else await this.saveToPdfFile(data, path);
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
