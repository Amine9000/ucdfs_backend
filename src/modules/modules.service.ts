import { Injectable } from '@nestjs/common';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Unit } from './entities/unit.entity';
import { In, Repository } from 'typeorm';
import { EtapesService } from 'src/etapes/etapes.service';

@Injectable()
export class ModulesService {
  constructor(
    @InjectRepository(Unit) private readonly unitRepo: Repository<Unit>,
    private readonly etapeService: EtapesService,
  ) {}
  async create(createModuleDto: CreateModuleDto) {
    const existingModule = await this.unitRepo.findOne({
      where: { module_code: createModuleDto.module_code },
    });
    if (!existingModule) {
      const existingEtape = await this.etapeService.findOne(
        createModuleDto.etape_code,
      );
      if (existingEtape) {
        const unit = this.unitRepo.create({ ...createModuleDto });
        unit.etape = existingEtape;
        return this.unitRepo.save(unit);
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

  update(id: number, updateModuleDto: UpdateModuleDto) {
    return { id, updateModuleDto };
  }

  remove(id: number) {
    return `This action removes a #${id} module`;
  }
}
