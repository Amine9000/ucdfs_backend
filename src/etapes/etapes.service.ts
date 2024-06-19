import { Injectable } from '@nestjs/common';
import { CreateEtapeDto } from './dto/create-etape.dto';
import { UpdateEtapeDto } from './dto/update-etape.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Etape } from './entities/etape.entity';
import { Repository } from 'typeorm';
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
        modules: etape.modules.length,
        etudiants: this.countStudentsByEtape(etape.modules),
      });
    }
    return etapes;
  }

  countStudentsByEtape(modules: Unit[]) {
    const CNEs = new Set<string>();
    modules.forEach((mod) =>
      mod.students.forEach((std) => CNEs.add(std.student_cne)),
    );
    return CNEs.size;
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
        nStd[mod.module_code] = 'NI';
      });
      modules.forEach((mod) => {
        if (mod_codes.has(mod.module_code)) {
          nStd[mod.module_code] = 'I';
        }
      });
      studentsData.push(nStd);
    });
    return studentsData;
  }

  findOne(etape_code: string) {
    return this.etapeRepo.findOne({ where: { etape_code } });
  }

  update(id: number, updateEtapeDto: UpdateEtapeDto) {
    return { id, updateEtapeDto };
  }

  remove(id: number) {
    return `This action removes a #${id} etape`;
  }
}
