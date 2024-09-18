import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ServiceFields } from './fields.entity';
import { UserService } from './user-service.entity';

@Entity({ name: 'services' })
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @OneToMany(() => UserService, (stdService) => stdService.service)
  studentServices: UserService[];

  @OneToMany(() => ServiceFields, (serviceFields) => serviceFields.service)
  fields: ServiceFields[];
}
