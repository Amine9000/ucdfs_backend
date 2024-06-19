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

  @Column({ unique: true })
  student_cne: string;

  @Column({ unique: true, nullable: true })
  student_cin: string;

  @Column({ type: 'date' })
  student_birthdate: Date;

  @ManyToMany(() => Unit, (etape) => etape.students)
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
