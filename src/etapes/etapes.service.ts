import { Injectable } from '@nestjs/common';
import { CreateEtapeDto } from './dto/create-etape.dto';
import { UpdateEtapeDto } from './dto/update-etape.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Etape } from './entities/etape.entity';
import { In, Repository } from 'typeorm';
import { Unit } from 'src/modules/entities/unit.entity';
import { Student } from 'src/students/entities/student.entity';

@Injectable()
export class EtapesService {
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
    }
  }

  async findAll(skip: number, take: number) {
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
    let count = 0;
    modules.forEach((mod) => {
      count += mod.students.length;
    });
    return count;
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
    students.forEach((std) => {
      const { modules, ...rest } = std;
      const nStd: object = {
        Code: rest.student_code,
        Prenom: rest.student_fname,
        Nom: rest.student_lname,
        CNE: rest.student_cne,
        CIN: rest.student_cin,
        'Date Naissance': rest.student_birthdate,
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

  findByEtapeCode(etape_codes: string[]) {
    return this.etapeRepo.find({ where: { etape_code: In(etape_codes) } });
  }

  findOne(etape_code: string) {
    return this.etapeRepo.findOne({ where: { etape_code } });
  }

  update(id: number, updateEtapeDto: UpdateEtapeDto) {
    return { id, updateEtapeDto };
  }

  createBulk(etapes: CreateEtapeDto[]) {
    return this.etapeRepo.save(etapes);
  }

  async remove(etape_code: string) {
    const etape = await this.etapeRepo.findOne({
      where: { etape_code },
      relations: ['modules'],
    });
    if (!etape)
      return {
        message: 'Etape not found',
      };
    return this.etapeRepo.remove(etape);
  }
}
