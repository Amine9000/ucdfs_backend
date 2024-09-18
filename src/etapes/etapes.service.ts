import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateEtapeDto } from './dto/create-etape.dto';
import { UpdateEtapeDto } from './dto/update-etape.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Etape } from './entities/etape.entity';
import { Repository } from 'typeorm';
import { Unit } from 'src/modules/entities/unit.entity';
import { Student } from 'src/users/entities/students.entity';
import { User } from 'src/users/entities/user.entity';

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
      relations: ['modules', 'modules.students', 'modules.students.user'],
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
        id: etape.etape_id,
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

  async studentsValidationByEtape(etape_id: string) {
    const etape = await this.etapeRepo.findOne({
      where: { etape_id },
      relations: [
        'modules',
        'modules.students',
        'modules.students.modules',
        'modules.students.user',
      ],
    });
    if (!etape) return { studentsData: [], etape: '' };
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
      const { user, ...student } = std;
      const nStd: object = {
        Numero: i + 1,
        Prenom: user.user_fname,
        Nom: user.user_lname,
      };
      allModules.forEach((mod) => {
        nStd[this.abbreviateCourseName(mod.module_name)] = 'NI';
      });
      student.modules.forEach((mod) => {
        if (mod_codes.has(mod.module_code)) {
          nStd[this.abbreviateCourseName(mod.module_name)] = 'I';
        }
      });
      studentsData.push(nStd);
    });
    return { studentsData, etapeName: etape.etape_name };
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

  findOne(etape_id: string) {
    return this.etapeRepo.findOne({ where: { etape_id } });
  }

  async update(etape_id: string, updateEtapeDto: UpdateEtapeDto) {
    const etape = await this.etapeRepo.findOne({
      where: { etape_id },
    });
    if (!etape) {
      return {
        message: 'No etape found with this ID ' + etape_id,
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

  async remove(etape_id: string): Promise<void> {
    // Start a transaction to ensure data integrity
    await this.etapeRepo.manager.transaction(
      async (transactionalEntityManager) => {
        // Find the Etape to delete
        const etape = await transactionalEntityManager.findOne(Etape, {
          where: { etape_id: etape_id },
          relations: ['modules', 'modules.students', 'modules.students.user'],
        });

        if (!etape) {
          throw new HttpException(
            `Etape with ID ${etape_id} not found`,
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
            .select('COUNT(DISTINCT etape.etape_code)', 'count')
            .from(Unit, 'unit')
            .innerJoin('unit.students', 'student')
            .innerJoin('unit.etape', 'etape') // Join on the Etape relation
            .where('student.id = :studentId', { studentId: student.id })
            .andWhere('etape.etape_id != :etape_id', { etape_id }) // Ensure etape_id exists in Unit
            .getRawOne();

          // If count is 0, delete the student
          if (parseInt(otherEtapesCount.count, 10) === 0) {
            await transactionalEntityManager.remove(Student, student);
            await transactionalEntityManager.remove(User, student.user);
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

        // Delete all Students
        // Step 1: Create a subquery to find users with the 'student' role
        const subQuery = transactionalEntityManager
          .createQueryBuilder(User, 'user')
          .select('user.user_id')
          .innerJoin('user.roles', 'role')
          .where('role.role_name = "student"')
          .getQuery();

        this.logger.verbose('Clearing all records from students');
        // Step 2: Delete from Student where the user has the role 'student'
        await transactionalEntityManager
          .createQueryBuilder()
          .delete()
          .from(Student)
          .where(`user IN (${subQuery})`)
          .execute();

        this.logger.verbose('Clearing all records from users');
        // Step 3: Delete from User where the role is 'student'
        await transactionalEntityManager
          .createQueryBuilder()
          .delete()
          .from(User)
          .where(`user_id IN (${subQuery})`)
          .execute();
      },
    );
  }
}
