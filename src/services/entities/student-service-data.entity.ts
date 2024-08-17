import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ServiceFields } from './fields.entity';
import { StudentService } from './student-service.entity';

@Entity({ name: 'student_service_data' })
export class StudentServiceData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => StudentService,
    (stdService) => stdService.studentServiceData,
    { onDelete: 'CASCADE' },
  )
  service: StudentService;

  @ManyToOne(() => ServiceFields, (field) => field.service, {
    onDelete: 'CASCADE',
  })
  field: ServiceFields;

  @Column()
  value: string;
}
