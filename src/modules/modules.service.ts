import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Unit } from './entities/unit.entity';
import { In, Repository } from 'typeorm';
import { EtapesService } from 'src/etapes/etapes.service';

@Injectable()
export class ModulesService {
  private readonly logger = new Logger(ModulesService.name);

  constructor(
    @InjectRepository(Unit) private readonly unitRepo: Repository<Unit>,
    private readonly etapeService: EtapesService,
  ) {}

  async create(createModuleDto: CreateModuleDto) {
    const existingEtape = await this.etapeService.findByEtapeCode(
      createModuleDto.etape_codes,
    );
    if (existingEtape) {
      const existingModule = await this.unitRepo.findOne({
        where: { module_code: createModuleDto.module_code },
        relations: ['etapes'],
      });
      if (!existingModule) {
        const unit = this.unitRepo.create({ ...createModuleDto });
        unit.etapes = existingEtape;
        return this.unitRepo.save(unit);
      } else {
        const etape_module_exists = existingModule.etapes.some(
          (etape) => etape.etape_code == createModuleDto.etape_codes[0],
        );
        if (!etape_module_exists) {
          this.update(existingModule.module_code, createModuleDto);
        }
      }
    }
  }

  async findByIds(modules: string[]) {
    return await this.unitRepo.find({ where: { module_code: In(modules) } });
  }

  findAll() {
    return `This action returns all modules`;
  }

  findOne(id: number) {
    return `This action returns a #${id} module`;
  }

  async update(module_code: string, updateModuleDto: UpdateModuleDto) {
    const module = await this.unitRepo.findOne({
      where: { module_code },
      relations: ['etapes'],
    });

    if (!module) {
      throw new NotFoundException(`Module with code ${module_code} not found`);
    }

    const existingEtapes = await this.etapeService.findByEtapeCode(
      updateModuleDto.etape_codes,
    );
    module.etapes = module.etapes || [];

    module.etapes = [...module.etapes, ...existingEtapes];
    return this.unitRepo.save(module);
  }

  remove(id: number) {
    return `This action removes a #${id} module`;
  }
}
