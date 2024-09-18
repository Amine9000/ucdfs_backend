import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Service } from './service.entity';
import { UserServiceData } from './user-service-data.entity';
import { User } from 'src/users/entities/user.entity';

export enum State {
  IN_PROGRESS = 'in Progress',
  COMPLETED = 'approved',
  PENDING = 'pending',
  REJECTED = 'rejected',
}

@Entity({ name: 'user_service' })
export class UserService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.services, {
    onDelete: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => Service, (service) => service.studentServices, {
    onDelete: 'CASCADE',
  })
  service: Service;

  @OneToMany(() => UserServiceData, (serviceData) => serviceData.service)
  studentServiceData: UserServiceData[];

  @Column({ type: 'enum', enum: State, default: State.PENDING })
  state: State;

  @Column({ type: 'date' })
  created_at: Date;
}
