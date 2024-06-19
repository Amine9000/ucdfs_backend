import { Etape } from 'src/etapes/entities/etape.entity';
import { Student } from 'src/students/entities/student.entity';
import { Column, Entity, JoinColumn, ManyToMany, ManyToOne } from 'typeorm';

@Entity({ name: 'modules' })
export class Unit {
  @Column({ primary: true })
  module_code: string;

  @Column()
  module_name: string;

  @ManyToOne(() => Etape, (etape) => etape.modules)
  @JoinColumn({ name: 'etape' })
  etape: Etape;

  @ManyToMany(() => Student, (student) => student.modules)
  students: Student[];
}
