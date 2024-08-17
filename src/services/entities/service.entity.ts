import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ServiceFields } from './fields.entity';
import { StudentService } from './student-service.entity';

@Entity({ name: 'services' })
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @OneToMany(() => StudentService, (stdService) => stdService.service)
  studentServices: StudentService[];

  @OneToMany(() => ServiceFields, (serviceFields) => serviceFields.service)
  fields: ServiceFields[];
}
