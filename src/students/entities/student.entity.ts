import { Unit } from 'src/modules/entities/unit.entity';
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
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

  @Column()
  student_email: string;

  @Column({ unique: true })
  student_cne: string;

  @Column({ unique: true })
  student_cin: string;

  @Column()
  student_birthday: string;

  @ManyToMany(() => Unit)
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
