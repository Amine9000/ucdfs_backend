import { Etape } from 'src/etapes/entities/etape.entity';
import { Student } from 'src/students/entities/student.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'modules' })
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  module_code: string;

  @Column()
  module_name: string;

  @ManyToOne(() => Etape, (etape) => etape.modules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'etape_code' })
  etape: Etape;

  @ManyToMany(() => Student, (student) => student.modules)
  students: Student[];
}
