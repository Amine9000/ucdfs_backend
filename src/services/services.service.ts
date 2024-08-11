import { Injectable } from '@nestjs/common';
import { CreateServiceDto, Field } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';
import { ServiceFields } from './entities/fields.entity';
import { error } from 'console';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(ServiceFields)
    private readonly serviceFieldsRepo: Repository<ServiceFields>,
  ) {}

  async createService(createServiceDto: CreateServiceDto) {
    this.validateServiceDto(createServiceDto);
    let service = await this.serviceRepo.findOne({
      where: { name: createServiceDto.name },
    });
    if (!service) {
      service = this.serviceRepo.create(createServiceDto);
      const fields = await this.createFields(createServiceDto.fields);
      service.fields = fields;
      try {
        this.serviceRepo.save(service);
      } catch (err) {
        return { error, status: 500 };
      }
    }
  }

  async createFields(fields: Field[]) {
    const serviceFields = fields.map((field) => {
      return this.serviceFieldsRepo.create({ ...field });
    });
    await this.serviceFieldsRepo.save(serviceFields);
    return serviceFields;
  }

  validateServiceDto(createServiceDto: CreateServiceDto) {
    if (!createServiceDto.name) {
      throw new Error('Name is required');
    }
    if (!createServiceDto.description) {
      throw new Error('description is required');
    }
    if (!Array.isArray(createServiceDto.fields))
      throw new Error('description is required');
  }

  findAllServices() {
    return this.serviceRepo.find({ relations: ['fields'] });
  }

  searchServices(q: string) {
    return this.serviceRepo
      .createQueryBuilder('service')
      .where(
        '(service.name LIKE :search_query OR service.description LIKE :search_query)',
        { search_query: `%${q}%` },
      )
      .getMany();
  }

  findOneService(id: string) {
    return this.serviceRepo.findOne({ where: { id }, relations: ['fields'] });
  }
  async updateService(id: string, updateServiceDto: UpdateServiceDto) {
    const service = await this.findOneService(id);
    if (!service) {
      throw new Error('Service not found');
    }
    await this.removeServiceField(service.fields);
    const fields = await this.createFields(updateServiceDto.fields);
    service.fields = fields;
    this.serviceRepo.update(id, service);
  }

  removeService(id: string) {
    return this.serviceRepo.delete(id);
  }
  removeServiceField(fields: ServiceFields[]) {
    return this.serviceFieldsRepo.remove(fields);
  }
}
