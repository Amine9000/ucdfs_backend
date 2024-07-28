import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { In, Repository } from 'typeorm';
import { ModulesService } from 'src/modules/modules.service';
import { Etape } from 'src/etapes/entities/etape.entity';
import * as bcrypt from 'bcrypt';
import { saltOrRounds } from 'src/users/constants/bcrypt';
import { Unit } from 'src/modules/entities/unit.entity';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    @InjectRepository(Student)
    private readonly studentsRepo: Repository<Student>,
    @InjectRepository(Etape)
    private readonly etapesRepo: Repository<Etape>,
    private readonly modulesService: ModulesService,
  ) {}
  async create(createStudentDto: CreateStudentDto): Promise<Student | null> {
    const { modules, ...studentDto } = createStudentDto;

    try {
      return await this.studentsRepo.manager.transaction(
        async (transactionalEntityManager) => {
          const existingStudent = await transactionalEntityManager.findOne(
            Student,
            {
              where: [
                { student_cne: studentDto.student_cne },
                { student_cin: studentDto.student_cin },
              ],
              lock: { mode: 'pessimistic_write' },
            },
          );

          if (existingStudent) {
            return null;
          }

          const modulesEntities = await this.modulesService.findByIds(modules);
          const student = this.studentsRepo.create({
            ...studentDto,
            student_pwd: await bcrypt.hash(
              studentDto.student_pwd,
              saltOrRounds,
            ),
          });
          student.modules = modulesEntities;
          return await transactionalEntityManager.save(student);
        },
      );
    } catch (error) {
      this.logger.error(JSON.stringify(error));
    }
  }

  findAll() {
    return `This action returns all students`;
  }

  async findAllByEtape(etape_code: string, skip: number, take: number) {
    const students = await this.studentsRepo
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.modules', 'module')
      .leftJoinAndSelect('module.etapes', 'etape')
      .where('etape.etape_code = :etape_code', { etape_code })
      .skip(skip)
      .take(take)
      .getMany();

    const data = students.map((student) => ({
      Code: student.student_code,
      Prenom: student.student_fname,
      Nom: student.student_lname,
      CNE: student.student_cne,
      CIN: student.student_cin,
      'Date Naissance': student.student_birthdate,
    }));
    return data;
  }

  async studentsValidationByEtape(
    etape_code: string,
    skip?: number,
    take?: number,
  ) {
    const etape = await this.etapesRepo.findOne({
      where: { etape_code },
      relations: ['modules'],
    });
    if (!etape) return [];

    const moduleCodes = etape.modules.map((mod) => mod.module_code);

    const studentIds = await this.studentsRepo
      .createQueryBuilder('student')
      .leftJoin('student.modules', 'module')
      .leftJoin('module.etapes', 'etape')
      .where('etape.etape_code = :etape_code', { etape_code })
      .select('student.id')
      .distinct(true)
      .skip(skip)
      .take(take)
      .getMany();

    if (studentIds.length === 0) return [];

    const students = await this.studentsRepo.find({
      where: { id: In(studentIds.map((s) => s.id)) },
      relations: ['modules', 'modules.etapes'],
    });

    const studentsData = students.map((student) => {
      const { modules, ...rest } = student;
      const nStd: any = {
        Code: rest.student_code,
        Prenom: rest.student_fname,
        Nom: rest.student_lname,
        CNE: rest.student_cne,
        CIN: rest.student_cin,
        'Date Naissance': rest.student_birthdate,
      };
      moduleCodes.forEach((modCode, i) => {
        nStd[this.abbreviateCourseName(etape.modules[i].module_name)] = 'NI';
      });
      modules.forEach((mod) => {
        if (moduleCodes.includes(mod.module_code)) {
          nStd[this.abbreviateCourseName(mod.module_name)] = 'I';
        }
      });
      return nStd;
    });

    return studentsData;
  }

  abbreviateCourseName(courseName: string) {
    courseName = courseName.replace(/[^0-9a-zA-Z ]/g, '');
    const words = courseName.split(' ');
    const excludedWords = ['de', 'la', 'et', 'le', 'les', 'des'];
    const index = words.findIndex((word) => !isNaN(parseFloat(word)));
    if (index !== -1) {
      return words.slice(0, index + 1).join(' ');
    } else {
      let wordCount = 0;
      let end = 0;
      for (let i = 0; i < words.length; i++) {
        if (!excludedWords.includes(words[i])) wordCount++;
        if (wordCount == 2) {
          end = i;
          break;
        }
      }
      return words.length <= 2
        ? words.join(' ')
        : words.slice(0, end + 1).join(' ');
    }
  }

  async searchStudents(
    etape_code: string,
    search_query: string,
    skip: number,
    take: number,
  ) {
    const studentIds = await this.studentsRepo
      .createQueryBuilder('student')
      .leftJoin('student.modules', 'module')
      .leftJoin('module.etapes', 'etape')
      .where('etape.etape_code = :etape_code', { etape_code })
      .andWhere(
        '(student.student_fname LIKE :search_query OR student.student_lname LIKE :search_query OR student.student_code LIKE :search_query OR student.student_cne LIKE :search_query OR student.student_cin LIKE :search_query)',
        { search_query: `%${search_query}%` },
      )
      .select('student.id')
      .distinct(true)
      .skip(skip)
      .take(take)
      .getMany();

    if (studentIds.length === 0) return [];

    const students = await this.studentsRepo.find({
      where: { id: In(studentIds.map((s) => s.id)) },
      relations: ['modules', 'modules.etapes'],
    });

    const studentsData = students.map((student) => {
      const nStd: any = {
        Code: student.student_code,
        Prenom: student.student_fname,
        Nom: student.student_lname,
        CNE: student.student_cne,
        CIN: student.student_cin,
        'Date Naissance': student.student_birthdate,
      };
      return nStd;
    });

    return studentsData;
  }

  async search(
    etape_code: string,
    search_query: string,
    skip: number,
    take: number,
  ) {
    const etape = await this.etapesRepo.findOne({
      where: { etape_code },
      relations: ['modules'],
    });
    if (!etape) return [];

    const moduleCodes = etape.modules.map((mod) => mod.module_code);

    const studentIds = await this.studentsRepo
      .createQueryBuilder('student')
      .leftJoin('student.modules', 'module')
      .leftJoin('module.etapes', 'etape')
      .where('etape.etape_code = :etape_code', { etape_code })
      .andWhere(
        '(student.student_fname LIKE :search_query OR student.student_lname LIKE :search_query OR student.student_code LIKE :search_query OR student.student_cne LIKE :search_query OR student.student_cin LIKE :search_query)',
        { search_query: `%${search_query}%` },
      )
      .select('student.id')
      .distinct(true)
      .skip(skip)
      .take(take)
      .getMany();

    if (studentIds.length === 0) return [];

    const students = await this.studentsRepo.find({
      where: { id: In(studentIds.map((s) => s.id)) },
      relations: ['modules', 'modules.etapes'],
    });

    const studentsData = students.map((student) => {
      const { modules, ...rest } = student;
      const nStd: any = {
        Code: rest.student_code,
        Prenom: rest.student_fname,
        Nom: rest.student_lname,
        CNE: rest.student_cne,
        CIN: rest.student_cin,
        'Date Naissance': rest.student_birthdate,
      };
      moduleCodes.forEach((modCode, i) => {
        nStd[this.abbreviateCourseName(etape.modules[i].module_name)] = 'NI';
      });
      modules.forEach((mod) => {
        if (moduleCodes.includes(mod.module_code)) {
          nStd[this.abbreviateCourseName(mod.module_name)] = 'I';
        }
      });
      return nStd;
    });

    return studentsData;
  }

  async findOne(code: string) {
    const studentData = await this.studentsRepo.findOne({
      where: { student_code: code },
      relations: ['modules', 'modules.etapes'],
    });
    if (!studentData) return null;

    const modules = studentData.modules;
    const etapes = {};

    const etapePromises = modules.map(async (mod) => {
      const modEtapePromises = mod.etapes.map(async (etape) => {
        const etapeEntity = await this.etapesRepo.findOne({
          where: { etape_code: etape.etape_code },
          relations: ['modules'],
        });
        if (!etapes[etape.etape_code]) {
          etapes[etape.etape_code] = {
            semester_code: etape.etape_code,
            semester_name: etape.etape_name,
            modules: etapeEntity.modules.map((m) => ({ ...m, status: 'NI' })),
          };
        }
        etapes[etape.etape_code].modules = etapes[etape.etape_code].modules.map(
          (m: Unit) => {
            return m.module_code == mod.module_code ? { ...m, status: 'I' } : m;
          },
        );
      });
      await Promise.all(modEtapePromises);
    });

    await Promise.all(etapePromises);
    return Object.values(etapes);
  }
  findStudentByCne(cne: string) {
    return this.studentsRepo.findOne({
      where: { student_cne: cne },
      relations: ['modules', 'modules.etapes'],
    });
  }

  async update(cne: string, updateStudentDto: UpdateStudentDto) {
    const student = await this.studentsRepo.findOne({
      where: { student_cne: cne },
    });
    if (student) {
      if (updateStudentDto.student_pwd) {
        if (!this.validatePassword(updateStudentDto.student_pwd))
          student.student_pwd = await bcrypt.hash(
            student.student_pwd,
            saltOrRounds,
          );
        throw new HttpException(
          'Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number and one special character',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (updateStudentDto.student_fname) {
        student.student_fname = updateStudentDto.student_fname;
      }
      if (updateStudentDto.student_lname)
        student.student_lname = updateStudentDto.student_lname;
      if (updateStudentDto.student_cne)
        student.student_cne = updateStudentDto.student_cne;
      if (updateStudentDto.student_cin)
        student.student_cin = updateStudentDto.student_cin;
      if (updateStudentDto.student_birthdate)
        student.student_birthdate = new Date(
          updateStudentDto.student_birthdate,
        );
      if (updateStudentDto.student_code)
        student.student_code = updateStudentDto.student_code;
      if (updateStudentDto.is_first_login)
        student.is_first_login = updateStudentDto.is_first_login;

      await this.studentsRepo.update({ student_cne: cne }, student);
      return {
        message: 'Student updated successfully',
      };
    }
  }
  validatePassword(student_pwd: string) {
    return student_pwd.length > 8;
  }

  async removeByCne(cne: string) {
    const student = this.studentsRepo.findOne({ where: { student_cne: cne } });
    if (student) {
      await this.studentsRepo.delete({ student_cne: cne });
      const message = {
        message: `Student with cne ${cne} has been deleted`,
      };
      return message;
    } else {
      const message = {
        message: `Student with cne ${cne} does not exist`,
      };
      return message;
    }
  }

  async createBulk(students: CreateStudentDto[]) {
    const cneList = students.map((student) => student.student_cne);
    const cinList = students.map((student) => student.student_cin);

    // Query existing students by cne or cin
    const existingStudents = await this.studentsRepo.find({
      where: [{ student_cne: In(cneList) }, { student_cin: In(cinList) }],
    });

    // Filter out students that already exist in the database
    const existingCneSet = new Set(
      existingStudents.map((student) => student.student_cne),
    );
    const existingCinSet = new Set(
      existingStudents.map((student) => student.student_cin),
    );

    const filteredStudents = students.filter(
      (student) =>
        !existingCneSet.has(student.student_cne) &&
        !existingCinSet.has(student.student_cin),
    );
    const entities = await Promise.all(
      filteredStudents.map(async (std) => {
        const { modules, ...rest } = std;
        const modulesEntities = await this.modulesService.findByIds(modules);
        const stdEntity = this.studentsRepo.create({
          ...rest,
          student_pwd: await bcrypt.hash(rest.student_pwd, saltOrRounds),
          student_cin: rest.student_cin ? rest.student_cin : null,
        });
        stdEntity.modules = modulesEntities;
        return stdEntity;
      }),
    );

    const stdNum = entities.length;
    const bulkSize = 1000;
    const bulksNum = Math.floor(stdNum / bulkSize);
    for (let i = 0; i < bulksNum; i++) {
      const bulk = entities.slice(i * bulkSize, (i + 1) * bulkSize);
      await this.studentsRepo.save(bulk);
    }

    // Handle any remaining entities that weren't covered by the full bulks
    const remainingEntities = entities.slice(bulksNum * bulkSize);
    if (remainingEntities.length > 0) {
      await this.studentsRepo.save(remainingEntities);
    }

    // Perform bulk insertion of filtered students
  }
}
