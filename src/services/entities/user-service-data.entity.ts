import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ServiceFields } from './fields.entity';
import { UserService } from './user-service.entity';

@Entity({ name: 'user_service_data' })
export class UserServiceData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserService, (stdService) => stdService.studentServiceData, {
    onDelete: 'CASCADE',
  })
  service: UserService;

  @ManyToOne(() => ServiceFields, (field) => field.service, {
    onDelete: 'CASCADE',
  })
  field: ServiceFields;

  @Column()
  value: string;
}
