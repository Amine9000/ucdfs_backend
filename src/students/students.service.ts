import { Injectable, Logger } from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Student } from './entities/student.entity';
import { In, Repository } from 'typeorm';
import { ModulesService } from 'src/modules/modules.service';
import { Etape } from 'src/etapes/entities/etape.entity';

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
          const student = this.studentsRepo.create({ ...studentDto });
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

  findOne(cne: string) {
    return this.studentsRepo.findOne({
      where: { student_cne: cne },
      relations: ['modules', 'modules.etapes'],
    });
  }

  update(id: number, updateStudentDto: UpdateStudentDto) {
    return { id, updateStudentDto };
  }

  remove(id: number) {
    return `This action removes a #${id} student`;
  }
}
