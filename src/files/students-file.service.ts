import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as xlsx from 'xlsx';
import { ModulesService } from 'src/modules/modules.service';
import { StudentsService } from 'src/students/students.service';
import { CreateStudentDto } from 'src/students/dto/create-student.dto';
import * as passwordGenerator from 'generate-password';

@Injectable()
export class StudentsFileService {
  private readonly logger = new Logger(StudentsFileService.name);
  constructor(
    private readonly modulesService: ModulesService,
    private readonly studentsService: StudentsService,
  ) {}
  async store(
    file: Express.Multer.File,
    modules: { module_code: string; etape_code: string }[],
  ) {
    let data = this.readFile(file.path);
    this.deleteFile(file.filename);
    data = data.map((d) => ({ ...d, modules: modules }));
    await this.saveStudents(data, modules);
    return data.map((d) => {
      return {
        student_fname: d.student_fname,
        student_lname: d.student_lname,
        student_cne: d.student_cne,
        student_cin: d.student_cin,
        student_birthdate: d.student_birthdate,
        student_pwd: d.student_pwd,
      };
    });
  }
  async saveStudents(
    data: CreateStudentDto[],
    modules: { module_code: string; etape_code: string }[],
  ) {
    return this.studentsService.createBulkByMod(data, modules);
  }

  readFile(path: string): CreateStudentDto[] {
    this.logger.verbose('READING THE FILE.');
    const workbook = xlsx.readFile(path, { cellDates: true });
    const sheet = workbook.SheetNames[0];
    const data: CreateStudentDto[] = xlsx.utils.sheet_to_json(
      workbook.Sheets[sheet],
    );
    return data.splice(30).map((row) => ({
      student_code: row['XX-APO_TITRES-XX'],
      student_lname: row['__EMPTY'],
      student_fname: row['__EMPTY_1'],
      student_birthdate: this.convertDateToISO(row['__EMPTY_2']),
      student_pwd: passwordGenerator.generate({
        length: 10,
        numbers: true,
      }),
      student_cin: row['XX-APO_TITRES-XX'],
      student_cne: row['XX-APO_TITRES-XX'],
      modules: [],
    }));
  }
  convertDateToISO(date: string) {
    const [day, month, year] = date.split('/').map(Number);

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  async deleteFile(name: string) {
    this.logger.verbose('FILE PATH : ' + name);
    if (fs.existsSync(name)) {
      fs.unlink(name, (err) => {
        if (err) {
          this.logger.error(err.message);
        }
      });
    }
  }
}
