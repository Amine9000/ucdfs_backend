import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateEtapeDto } from './dto/create-etape.dto';
import { UpdateEtapeDto } from './dto/update-etape.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Etape } from './entities/etape.entity';
import { Repository } from 'typeorm';
import { Unit } from 'src/modules/entities/unit.entity';
import { Student } from 'src/students/entities/student.entity';

@Injectable()
export class EtapesService {
  private readonly logger = new Logger(EtapesService.name);
  constructor(
    @InjectRepository(Etape) private readonly etapeRepo: Repository<Etape>,
  ) {}
  async create(createEtapeDto: CreateEtapeDto) {
    const ExistingEtape = await this.etapeRepo.findOne({
      where: { etape_code: createEtapeDto.etape_code },
    });
    if (!ExistingEtape) {
      const etape = this.etapeRepo.create({ ...createEtapeDto });
      return this.etapeRepo.save(etape);
    } else {
      throw new HttpException('Etape already exists', HttpStatus.BAD_REQUEST);
    }
  }

  async findAll(skip: number, take: number) {
    if (skip * take < 0) {
      return [];
    }
    const data = await this.etapeRepo.find({
      relations: ['modules', 'modules.students'],
      // implement pagination here
      skip: skip,
      take: take,
    });
    return this.transformData(data);
  }

  transformData(data: Etape[]) {
    const etapes: object[] = [];
    for (const etape of data) {
      etapes.push({
        code: etape.etape_code,
        nom: etape.etape_name,
        semester:
          etape.modules.length > 0
            ? etape.modules[0].module_code[4]
            : 'unknown',
        modules: etape.modules.length,
        etudiants: this.countStudentsByEtape(etape.modules),
      });
    }
    return etapes;
  }

  countStudentsByEtape(modules: Unit[]) {
    const studentSet = new Set<string>();

    modules.forEach((mod) => {
      mod.students.forEach((student) => {
        studentSet.add(student.id);
      });
    });

    return studentSet.size;
  }

  async studentsValidationByEtape(etape_code: string) {
    const etape = await this.etapeRepo.findOne({
      where: { etape_code },
      relations: ['modules', 'modules.students', 'modules.students.modules'],
    });
    if (!etape) return [];
    const students: Student[] = [];
    const CNEs = new Set<string>();
    const allModules: Unit[] = [];
    const mod_codes = new Set<string>();
    etape.modules.forEach((mod) => {
      if (!mod_codes.has(mod.module_code)) {
        mod_codes.add(mod.module_code);
        allModules.push(mod);
      }
      mod.students.forEach((std) => {
        if (!CNEs.has(std.student_cne)) {
          CNEs.add(std.student_cne);
          students.push(std);
        }
      });
    });
    const studentsData: object[] = [];
    students.forEach((std, i) => {
      const { modules, ...rest } = std;
      const nStd: object = {
        Numero: i + 1,
        Prenom: rest.student_fname,
        Nom: rest.student_lname,
      };
      allModules.forEach((mod) => {
        nStd[this.abbreviateCourseName(mod.module_name)] = 'NI';
      });
      modules.forEach((mod) => {
        if (mod_codes.has(mod.module_code)) {
          nStd[this.abbreviateCourseName(mod.module_name)] = 'I';
        }
      });
      studentsData.push(nStd);
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

  async search(search_query: string, skip: number, take: number) {
    const queryBuilder = this.etapeRepo
      .createQueryBuilder('etape')
      .leftJoinAndSelect('etape.modules', 'module')
      .leftJoinAndSelect('module.students', 'student')
      .where(
        'etape.etape_code LIKE :search_query OR etape.etape_name LIKE :search_query',
        {
          search_query: `%${search_query}%`,
        },
      )
      .skip(skip)
      .take(take);

    const data = await queryBuilder.getMany();

    return this.transformData(data);
  }

  findAllEtapes() {
    return this.etapeRepo.find();
  }

  findByEtapeCode(etape_code: string) {
    return this.etapeRepo.findOne({ where: { etape_code: etape_code } });
  }

  findOne(etape_code: string) {
    return this.etapeRepo.findOne({ where: { etape_code } });
  }

  async update(etape_code: string, updateEtapeDto: UpdateEtapeDto) {
    const etape = await this.etapeRepo.findOne({
      where: { etape_code: etape_code },
    });
    if (!etape) {
      return {
        message: 'No etape found with this code ' + etape_code,
        status: HttpStatus.CREATED,
      };
    }
    if (updateEtapeDto.etape_code && updateEtapeDto.etape_code.length > 0)
      etape.etape_code = updateEtapeDto.etape_code;
    if (updateEtapeDto.etape_name && updateEtapeDto.etape_name.length > 0)
      etape.etape_name = updateEtapeDto.etape_name;
    await this.etapeRepo.save(etape);
    return {
      message: 'etatpe was updated successefully',
      status: HttpStatus.CREATED,
    };
  }

  createBulk(etapes: CreateEtapeDto[]) {
    return this.etapeRepo.save(etapes);
  }

  async remove(etapeCode: string): Promise<void> {
    // Start a transaction to ensure data integrity
    await this.etapeRepo.manager.transaction(
      async (transactionalEntityManager) => {
        // Find the Etape to delete
        const etape = await transactionalEntityManager.findOne(Etape, {
          where: { etape_code: etapeCode },
          relations: ['modules', 'modules.students'],
        });

        if (!etape) {
          throw new HttpException(
            `Etape with code ${etapeCode} not found`,
            HttpStatus.BAD_REQUEST,
          );
        }

        // Get all students related to this Etape
        const studentsToCheck = etape.modules.flatMap(
          (module) => module.students,
        );

        // Delete the join table records first
        if (etape.modules.length > 0)
          await transactionalEntityManager
            .createQueryBuilder()
            .delete()
            .from('students_modules')
            .where('module IN (:...moduleIds)', {
              moduleIds: etape.modules.map((module) => module.id),
            })
            .execute();

        // Delete the Etape and its associated Units
        await transactionalEntityManager.remove(Etape, etape);

        // Check if any students are only related to this Etape
        for (const student of studentsToCheck) {
          const otherEtapesCount = await transactionalEntityManager
            .createQueryBuilder()
            .select('COUNT(DISTINCT unit.etape_code)', 'count')
            .from(Unit, 'unit')
            .innerJoin('unit.students', 'student')
            .where('student.id = :studentId', { studentId: student.id })
            .andWhere('unit.etape_code <> :etapeCode', { etapeCode })
            .getRawOne();

          // If count is 0, delete the student
          if (parseInt(otherEtapesCount.count, 10) === 0) {
            await transactionalEntityManager.remove(Student, student);
          }
        }
      },
    );
  }

  async clearAll(): Promise<void> {
    await this.etapeRepo.manager.transaction(
      async (transactionalEntityManager) => {
        this.logger.verbose('Clearing all records from students_modules');
        // Delete from students_modules table
        await transactionalEntityManager
          .createQueryBuilder()
          .delete()
          .from('students_modules')
          .execute();

        this.logger.verbose('Clearing all records from Modules');
        // Delete all Units (Modules)
        await transactionalEntityManager
          .createQueryBuilder()
          .delete()
          .from(Unit)
          .execute();

        this.logger.verbose('Clearing all records from etapes');
        // Delete all Etapes
        await transactionalEntityManager
          .createQueryBuilder()
          .delete()
          .from(Etape)
          .execute();

        this.logger.verbose('Clearing all records from students');
        // Delete all Students
        await transactionalEntityManager
          .createQueryBuilder()
          .delete()
          .from(Student)
          .execute();
      },
    );
  }
}
