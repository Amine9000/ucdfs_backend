import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Service } from './service.entity';
import { Student } from 'src/students/entities/student.entity';
import { StudentServiceData } from './student-service-data.entity';

export enum State {
  IN_PROGRESS = 'in Progress',
  COMPLETED = 'completed',
  PENDING = 'pending',
}

@Entity({ name: 'student_service' })
export class StudentService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Student, (std) => std.services, {
    onDelete: 'CASCADE',
  })
  student: Student;

  @ManyToOne(() => Service, (service) => service.studentServices, {
    onDelete: 'CASCADE',
  })
  service: Service;

  @OneToMany(() => StudentServiceData, (serviceData) => serviceData.service)
  studentServiceData: StudentServiceData[];

  @Column({ type: 'enum', enum: State, default: State.PENDING })
  state: State;

  @Column({ type: 'date' })
  created_at: Date;
}
