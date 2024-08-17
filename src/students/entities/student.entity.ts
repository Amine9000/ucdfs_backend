import { Unit } from 'src/modules/entities/unit.entity';
import { StudentService } from 'src/services/entities/student-service.entity';
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'students' })
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  student_code: string;

  @Column()
  student_fname: string;

  @Column()
  student_lname: string;

  @Column({ nullable: true })
  student_cne: string;

  @Column({ nullable: true })
  student_cin: string;

  @Column({ type: 'date' })
  student_birthdate: Date;

  @Column()
  student_pwd: string;

  @Column({ default: false, type: 'boolean' })
  is_first_login: boolean;

  @Column({ default: 'avatars/default.jpeg' })
  student_avatar_path: string;

  @OneToMany(() => StudentService, (stdService) => stdService.student)
  services: StudentService[];

  @ManyToMany(() => Unit, (etape) => etape.students, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinTable({
    name: 'students_modules',
    joinColumn: {
      name: 'student',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'module',
      referencedColumnName: 'module_code',
    },
  })
  modules: Unit[];
}
