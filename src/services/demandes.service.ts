import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ServiceFields } from './entities/fields.entity';
import { CreateDemandeDto } from './dto/create-demande.dto';
import { State, UserService } from './entities/user-service.entity';
import { UserServiceData } from './entities/user-service-data.entity';
import { Service } from './entities/service.entity';
import { UpdateDemandeDto } from './dto/update-demande.dto';
import { User } from 'src/users/entities/user.entity';
import { Student } from 'src/users/entities/students.entity';

@Injectable()
export class DemandesService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(ServiceFields)
    private readonly serviceFieldsRepo: Repository<ServiceFields>,
    @InjectRepository(UserService)
    private readonly userServiceRepo: Repository<UserService>,
    @InjectRepository(UserServiceData)
    private readonly stdServiceDataRepo: Repository<UserServiceData>,
  ) {}

  async createDemande(createDemandeDto: CreateDemandeDto) {
    const { user_id, service_id, fieldsValues } = createDemandeDto;

    const user = await this.userRepo.findOne({
      where: { user_id: user_id },
      relations: ['student'],
    });
    if (!user) throw new NotFoundException('Student not found');

    const service = await this.serviceRepo.findOne({
      where: { id: service_id },
    });
    if (!service) throw new NotFoundException('Service not found');

    const serviceFields = await this.serviceFieldsRepo.find({
      where: { id: In(fieldsValues.map((field) => field.field_id)) },
    });

    if (serviceFields.length !== fieldsValues.length) {
      throw new NotFoundException('One or more fields not found');
    }

    const studentService = this.userServiceRepo.create({
      service: service,
      user: user,
      created_at: new Date(),
    });

    await this.userServiceRepo.save(studentService);

    const studentServiceData = fieldsValues.map((fieldValue) => {
      const field = serviceFields.find((f) => f.id === fieldValue.field_id);
      if (!field) throw new NotFoundException('Field not found');

      return this.stdServiceDataRepo.create({
        service: studentService,
        field: field,
        value: fieldValue.value,
      });
    });

    await this.stdServiceDataRepo.save(studentServiceData);
  }

  async findAllDemandesByStdID(id: string) {
    const user = await this.userRepo.findOne({
      where: { user_id: id },
      relations: ['student'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userServices = await this.userServiceRepo.find({
      where: { user: { user_id: user.user_id } },
      relations: [
        'user',
        'user.student',
        'user.roles',
        'service',
        'service.fields',
        'studentServiceData',
        'studentServiceData.field',
      ],
    });

    return userServices;
  }

  async findAllDemandes() {
    const userSer = await this.userServiceRepo.find({
      relations: [
        'user',
        'user.roles',
        'user.student',
        'service',
        'service.fields',
        'studentServiceData',
        'studentServiceData.field',
      ],
    });

    return userSer;
  }

  findOneDemande(id: string) {
    return this.userServiceRepo.findOne({
      where: { id },
      relations: [
        'student',
        'service',
        'service.fields',
        'studentServiceData',
        'studentServiceData.field',
      ],
    });
  }
  async updateDemande(id: string, updateDemandeDto: UpdateDemandeDto) {
    const studentService = await this.userServiceRepo.findOne({
      where: { id },
    });

    if (!studentService) {
      throw new NotFoundException('Demande not found');
    }

    studentService.state = updateDemandeDto.state;

    await this.userServiceRepo.save(studentService);

    return studentService;
  }

  async removeDemande(id: string) {
    const studentService = await this.userServiceRepo.findOne({
      where: { id },
    });

    if (!studentService) {
      throw new NotFoundException('Demande not found');
    }
    if (studentService.state == State.PENDING)
      await this.userServiceRepo.remove(studentService);
  }
}
