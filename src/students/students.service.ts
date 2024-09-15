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
import * as passwordGenerator from 'generate-password';

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
  async create(
    createStudentDto: CreateStudentDto,
  ): Promise<{ message: string; status: HttpStatus } | null> {
    const { modules, ...studentDto } = createStudentDto;
    return await this.studentsRepo.manager.transaction(
      async (transactionalEntityManager) => {
        const existingStudent = await transactionalEntityManager.findOne(
          Student,
          {
            where: [
              { student_code: studentDto.student_code },
              { student_cne: studentDto.student_cne },
              { student_cin: studentDto.student_cin },
            ],
            lock: { mode: 'pessimistic_write' },
          },
        );

        if (existingStudent) {
          if (existingStudent.student_cne == studentDto.student_cne) {
            return {
              message: 'CNE already exists, please choose another CNE',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          if (existingStudent.student_cin == studentDto.student_cin) {
            return {
              message: 'CIN already exists, please choose another CIN',
              status: HttpStatus.BAD_REQUEST,
            };
          }
          if (existingStudent.student_code == studentDto.student_code) {
            return {
              message: 'CODE already exists, please choose another CODE',
              status: HttpStatus.BAD_REQUEST,
            };
          }
        }

        const modulesEntities =
          await this.modulesService.findByModulesAndEtapes(modules);
        const student = this.studentsRepo.create({
          ...studentDto,
          student_pwd: await bcrypt.hash(studentDto.student_pwd, saltOrRounds),
        });
        student.modules = modulesEntities;
        await transactionalEntityManager.save(student);
        return {
          message: 'Student created successfully',
          status: HttpStatus.CREATED,
          user: {
            id: student.id,
            student_code: student.student_code,
            student_cne: student.student_cne,
            student_cin: student.student_cin,
            student_pwd: student.student_pwd,
            student_fname: student.student_fname,
            student_lname: student.student_lname,
            student_birthdate: student.student_birthdate,
          },
        };
      },
    );
  }

  async findAllByEtape(etape_code: string, skip: number, take: number) {
    const students = await this.studentsRepo
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.modules', 'module')
      .leftJoinAndSelect('module.etape', 'etape')
      .where('etape.etape_code = :etape_code', { etape_code })
      .skip(skip)
      .take(take)
      .getMany();

    const data = students.map((student) => ({
      id: student.id,
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
      .leftJoin('module.etape', 'etape')
      .where('etape.etape_code = :etape_code', { etape_code })
      .select('student.id')
      .distinct(true)
      .skip(skip)
      .take(take)
      .getMany();

    if (studentIds.length === 0) return [];

    const students = await this.studentsRepo.find({
      where: { id: In(studentIds.map((s) => s.id)) },
      relations: ['modules', 'modules.etape'],
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
    const excludedWords = [
      'de',
      'la',
      'et',
      'le',
      'les',
      'des',
      'en',
      'un',
      'une',
      'du',
      'au',
      'aux',
      'dans',
      'par',
      'pour',
      'sur',
      'avec',
      'sans',
      'que',
      'qui',
    ];

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
      .leftJoin('module.etape', 'etape')
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
      relations: ['modules', 'modules.etape'],
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
      .leftJoin('module.etape', 'etape')
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
      relations: ['modules', 'modules.etape'],
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
      relations: ['modules', 'modules.etape'],
    });
    if (!studentData) return null;

    const modules = studentData.modules;
    const etapes = {};

    const etapePromises = modules.map(async (mod) => {
      const etape = mod.etape;
      const etapeEntity = await this.etapesRepo.findOne({
        where: { etape_code: etape.etape_code },
        relations: ['modules'],
      });
      if (!etapes[etape.etape_code]) {
        etapes[etape.etape_code] = {
          semester_code: etape.etape_code,
          semester_name: etape.etape_name,
          modules: etapeEntity.modules
            ? etapeEntity.modules.map((m) => {
                return {
                  nom: m.module_name,
                  code: m.module_code,
                  status: 'NI',
                };
              })
            : [],
        };
      }
      if (etapes[etape.etape_code].modules.length > 0)
        etapes[etape.etape_code].modules = etapes[etape.etape_code].modules.map(
          (m: { nom: string; code: string; status: string }) => {
            return m.code == mod.module_code ? { ...m, status: 'I' } : m;
          },
        );
    });

    await Promise.all(etapePromises);
    return Object.values(etapes);
  }
  findStudentByCne(cne: string) {
    return this.studentsRepo.findOne({
      where: { student_cne: cne },
      relations: ['modules', 'modules.etape'],
    });
  }

  async update(id: string, updateStudentDto: UpdateStudentDto) {
    const student = await this.studentsRepo.findOne({
      where: { id },
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

      await this.studentsRepo.update({ id }, student);
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
    try {
      // Extract CNE and CIN values
      const cneList = students.map((student) => student.student_cne);
      const cinList = students.map((student) => student.student_cin);

      // Query existing students
      const existingStudents = await this.studentsRepo.find({
        where: [{ student_cne: In(cneList) }, { student_cin: In(cinList) }],
      });

      // Create sets for existing CNE and CIN
      const existingCneSet = new Set(
        existingStudents.map((student) => student.student_cne),
      );
      const existingCinSet = new Set(
        existingStudents.map((student) => student.student_cin),
      );

      // Filter out existing students
      const filteredStudents = students.filter(
        (student) =>
          !existingCneSet.has(student.student_cne) &&
          !existingCinSet.has(student.student_cin),
      );

      // Map and create student entities
      const entities = await Promise.all(
        filteredStudents.map(async (std) => {
          const { modules, ...rest } = std;
          const modulesEntities =
            await this.modulesService.findByModulesAndEtapes(modules);
          const hashedPwd = await bcrypt.hash(rest.student_pwd, saltOrRounds);
          const stdEntity = this.studentsRepo.create({
            ...rest,
            student_pwd: hashedPwd,
            student_cin: rest.student_cin ? rest.student_cin : null,
          });
          stdEntity.modules = modulesEntities;
          return stdEntity;
        }),
      );

      // Define bulk size
      const stdNum = entities.length;
      const bulkSize = 200;
      const bulksNum = Math.floor(stdNum / bulkSize);

      // Start transaction to ensure atomicity
      await this.studentsRepo.manager.transaction(
        async (transactionalEntityManager) => {
          // Insert students in bulk
          for (let i = 0; i < bulksNum; i++) {
            const bulk = entities.slice(i * bulkSize, (i + 1) * bulkSize);
            await transactionalEntityManager.save(Student, bulk);
          }

          // Insert remaining students
          const remainingEntities = entities.slice(bulksNum * bulkSize);
          if (remainingEntities.length > 0) {
            await transactionalEntityManager.save(Student, remainingEntities);
          }
        },
      );
    } catch (error) {
      console.error('Error during bulk creation:', error);
      throw new Error('Failed to create students in bulk.');
    }
  }

  async createBulkByMod(
    students: CreateStudentDto[],
    modules: { module_code: string; etape_code: string }[],
  ) {
    if (modules.length <= 0) return;
    // const etape_code = modules[0].etape_code;
    const codeList = Array.from(
      new Set<string>(students.map((student) => student.student_code)),
    );

    // Query existing students by cne or cin
    const existingStudents =
      (await this.studentsRepo.find({
        where: [{ student_code: In(codeList) }],
        relations: ['modules'],
      })) || [];

    // Filter out students that already exist in the database
    const existingCodeSet = new Set(
      existingStudents.map((student) => student.student_code),
    );

    const filteredStudents = students.filter(
      (student) => !existingCodeSet.has(String(student.student_code)),
    );

    const modulesEntities =
      await this.modulesService.findByModulesAndEtapes(modules);
    const entities = await Promise.all(
      filteredStudents.map(async (std) => {
        const stdEntity = this.studentsRepo.create({
          ...std,
          student_pwd: await bcrypt.hash(std.student_pwd, saltOrRounds),
          student_cin: std.student_cin ? std.student_cin : null,
          modules: [],
        });
        stdEntity.modules = modulesEntities;
        return stdEntity;
      }),
    );

    if (existingStudents && existingStudents.length > 0) {
      for (const std of existingStudents) {
        const existingModuleCodes = new Set();
        if (std.modules && std.modules.length > 0) {
          for (const mod of std.modules) {
            existingModuleCodes.add(mod.module_code);
          }
        }
        const newModules =
          await this.modulesService.findByModulesAndEtapes(modules);

        const uniqueNewModules = newModules.filter(
          (mod) => !existingModuleCodes.has(mod.module_code),
        );

        // Only add the unique new modules
        if (uniqueNewModules.length > 0) {
          std.modules = [...(std.modules || []), ...uniqueNewModules];
        }
        // Push the updated student object into the array
        entities.push(std);
      }
    }

    const stdNum = entities.length;
    const bulkSize = 300;
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

  async regenpwd(code: string) {
    const student = await this.studentsRepo.findOne({
      where: { student_code: code },
    });
    if (!student) {
      return { message: 'Student not found' };
    }
    const salt = bcrypt.genSaltSync(10);
    const pwd = passwordGenerator.generate({
      length: 10,
      numbers: true,
    });
    const hashedPassword = bcrypt.hashSync(pwd, salt);
    student.student_pwd = hashedPassword;
    await this.studentsRepo.save(student);
    return { password: pwd, message: 'Password regenerated successfully' };
  }

  async changepwd(code: string, password: string) {
    const student = await this.studentsRepo.findOne({
      where: { student_code: code },
    });
    if (!student) {
      return { message: 'Student not found', success: false };
    }
    if (!student.is_first_login)
      return {
        message: 'Student already changed its password',
        success: false,
      };

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    student.student_pwd = hashedPassword;
    student.is_first_login = false;
    await this.studentsRepo.save(student);
    return {
      password: password,
      message: 'Password regenerated successfully',
      success: true,
    };
  }

  async clearStudentsTable() {
    try {
      const students = await this.studentsRepo.find({
        relations: ['modules'],
      });
      let counter = 0;
      const range = 100;

      while (counter < students.length) {
        const batch = students.slice(counter, counter + range);
        await this.studentsRepo.remove(batch);
        counter += range;
      }
    } catch (error) {
      throw new HttpException(
        'Error clearing students table',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
