import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ServiceFields } from './entities/fields.entity';
import { CreateDemandeDto } from './dto/create-demande.dto';
import { StudentService } from './entities/student-service.entity';
import { StudentServiceData } from './entities/student-service-data.entity';
import { Service } from './entities/service.entity';
import { UpdateDemandeDto } from './dto/update-demande.dto';
import { Student } from 'src/students/entities/student.entity';

@Injectable()
export class DemandesService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(ServiceFields)
    private readonly serviceFieldsRepo: Repository<ServiceFields>,
    @InjectRepository(StudentService)
    private readonly stdServiceRepo: Repository<StudentService>,
    @InjectRepository(StudentServiceData)
    private readonly stdServiceDataRepo: Repository<StudentServiceData>,
  ) {}

  async createDemande(createDemandeDto: CreateDemandeDto) {
    const { student_id, service_id, fieldsValues } = createDemandeDto;

    const student = await this.studentRepo.findOne({
      where: { id: student_id },
    });
    if (!student) throw new NotFoundException('Student not found');

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

    const studentService = this.stdServiceRepo.create({
      service: service,
      student: student,
      created_at: new Date(),
    });

    await this.stdServiceRepo.save(studentService);

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

  findAllDemandes() {
    return this.stdServiceRepo.find({
      relations: [
        'student',
        'service',
        'service.fields',
        'studentServiceData',
        'studentServiceData.field',
      ],
    });
  }

  findOneDemande(id: string) {
    return this.stdServiceRepo.findOne({
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
    const studentService = await this.stdServiceRepo.findOne({
      where: { id },
    });

    if (!studentService) {
      throw new NotFoundException('Demande not found');
    }

    studentService.state = updateDemandeDto.state;

    await this.stdServiceRepo.save(studentService);

    return studentService;
  }

  async removeDemande(id: string) {
    const studentService = await this.stdServiceRepo.findOne({
      where: { id },
    });

    if (!studentService) {
      throw new NotFoundException('Demande not found');
    }

    await this.stdServiceRepo.remove(studentService);
  }
}
