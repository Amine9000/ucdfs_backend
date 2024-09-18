import { Unit } from 'src/modules/entities/unit.entity';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity({ name: 'students' })
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.student)
  @JoinColumn()
  user: User;

  @Column({ unique: true })
  student_code: string;

  @Column({ nullable: true })
  student_cne: string;

  @Column({ nullable: true })
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
      referencedColumnName: 'id',
    },
  })
  modules: Unit[];
}
