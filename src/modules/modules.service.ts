import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateModuleDto,
  CreateModuleEtapesDto,
} from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Unit } from './entities/unit.entity';
import { In, Repository } from 'typeorm';
import { EtapesService } from 'src/etapes/etapes.service';
import { Etape } from 'src/etapes/entities/etape.entity';
import { Student } from 'src/users/entities/students.entity';

@Injectable()
export class ModulesService {
  private readonly logger = new Logger(ModulesService.name);
  BATCH_SIZE: number = 100;

  constructor(
    @InjectRepository(Unit) private readonly unitRepo: Repository<Unit>,
    @InjectRepository(Etape) private readonly etapeRepo: Repository<Etape>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    private readonly etapeService: EtapesService,
  ) {}

  async create(createModuleDto: CreateModuleEtapesDto) {
    const etapes = await this.etapeRepo.find({
      where: [{ etape_code: In(createModuleDto.etape_codes) }],
    });
    if (!etapes || etapes.length < 0)
      throw new HttpException(
        `Etape ${createModuleDto.etape_codes.join(', ')} already exists`,
        HttpStatus.BAD_REQUEST,
      );
    const unit = this.unitRepo.create({ ...createModuleDto });
    etapes.forEach((etape) => {
      unit.etape = etape;
      this.unitRepo.save(unit);
    });
    return {
      message: 'Module created successfully',
      unit,
    };
  }

  async findByModulesAndEtapes(
    modulesEtapes: { module_code: string; etape_code: string }[],
  ) {
    return await this.unitRepo.find({
      where: modulesEtapes.map(({ module_code, etape_code }) => ({
        module_code,
        etape: {
          etape_code,
        },
      })),
      relations: ['etape'],
    });
  }

  findAll() {
    return this.unitRepo.find();
  }

  async findBySemester(etape_code: string) {
    const etape = await this.etapeService.findByEtapeCode(etape_code);
    return this.unitRepo.find({
      where: { etape: etape },
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} module`;
  }

  async update(module_code: string, updateModuleDto: UpdateModuleDto) {
    const module = await this.unitRepo.findOne({
      where: { module_code },
      relations: ['etape'],
    });

    if (!module) {
      throw new NotFoundException(`Module with code ${module_code} not found`);
    }

    const existingEtape = await this.etapeService.findByEtapeCode(
      updateModuleDto.etape_code,
    );
    module.etape = existingEtape;
    return this.unitRepo.save(module);
  }

  remove(id: number) {
    return `This action removes a #${id} module`;
  }
  async createBulk(modules: CreateModuleDto[]) {
    const moduleCodes = modules.map((mod) => mod.module_code);

    const existingModules = await this.unitRepo.find({
      where: { module_code: In(moduleCodes) },
    });

    const existingModuleCodes = existingModules.map((mod) => mod.module_code);

    const newModuleCodes = modules.filter(
      (mod) => !existingModuleCodes.includes(mod.module_code),
    );

    const moduleEntities = await Promise.all(
      newModuleCodes.map(async (mod) => {
        const etape = await this.etapeService.findByEtapeCode(mod.etape_code);
        return this.unitRepo.create({
          ...mod,
          etape,
        });
      }),
    );
    return this.unitRepo.save(moduleEntities);
  }
  async clearModulesTable(): Promise<void> {
    try {
      await this.unitRepo.delete({});
    } catch (error) {
      throw new HttpException(
        'Error clearing modules table',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async mergeBranches(
    etape_codes: string[],
    branchName: string,
    codeBranch: string,
  ) {
    this.logger.verbose(
      `Merging branches: ${etape_codes.join(', ')} into ${branchName}`,
    );
    // Fetch etapes with their modules
    const etapes = await this.etapeRepo.find({
      where: {
        etape_code: In(etape_codes),
      },
      relations: ['modules', 'modules.students', 'modules.students.modules'],
    });

    // Create a map to track module codes and ensure uniqueness
    const moduleMap = new Map<string, CreateModuleDto>();
    const studentsToUpdate = new Set<Student>();
    const studentsToUpdateIds = new Set<string>();

    // Iterate through etapes and modules
    etapes.forEach((etape) => {
      etape.modules.forEach((mod) => {
        // Create a new Unit entity for each module if it doesn't already exist in the map
        if (!moduleMap.has(mod.module_code)) {
          const newModule: CreateModuleDto = {
            module_code: mod.module_code,
            module_name: mod.module_name,
            etape_code: codeBranch,
          };
          moduleMap.set(mod.module_code, newModule);
        }
        mod.students.forEach((student) => {
          if (!studentsToUpdateIds.has(student.id)) {
            studentsToUpdate.add(student);
            studentsToUpdateIds.add(student.id);
          }
        });
      });
    });

    // Convert map values to an array
    const newModules = Array.from(moduleMap.values());
    // Create a new Etape entity
    const newEtape = this.etapeRepo.create({
      etape_code: codeBranch,
      etape_name: branchName,
    });

    // Save the new Etape entity along with its new modules
    const etapeEntity = await this.etapeRepo.save(newEtape);

    const modEntities = await this.createManyMods(newModules, etapeEntity);

    // Update students to reflect the new module associations
    await this.updateStudentModules(studentsToUpdate, modEntities);

    // Return the updated list of Etapes
    this.logger.verbose(
      `End of Merging new branches created successfully ${branchName}`,
    );
    return this.etapeService.findAll(0, 10);
  }

  async createManyMods(modules: CreateModuleDto[], etape: Etape) {
    this.logger.verbose(
      `Creating ${modules.length} modules for etape ${etape.etape_code}`,
    );
    const moduleEntities = await Promise.all(
      modules.map(async (mod) => {
        return this.unitRepo.create({
          ...mod,
          etape,
        });
      }),
    );
    return this.unitRepo.save(moduleEntities);
  }

  async updateStudentModules(students: Set<Student>, allModules: Unit[]) {
    this.logger.verbose(
      `Updating ${students.size} students with new module associations`,
    );
    const studentArray = Array.from(students);
    for (let i = 0; i < studentArray.length; i += this.BATCH_SIZE) {
      const batch = studentArray.slice(i, i + this.BATCH_SIZE);

      const updatedStudents = await Promise.all(
        batch.map(async (student) => {
          const studentsModCodes = student.modules.map(
            (mod) => mod.module_code,
          );
          const newModules = allModules.filter((mod) =>
            studentsModCodes.includes(mod.module_code),
          );
          student.modules.push(...newModules);
          return student;
        }),
      );

      // Save the batch of updated students
      await this.studentRepo.save(updatedStudents);
    }
  }
}
