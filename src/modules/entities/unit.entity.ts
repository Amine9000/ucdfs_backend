import { Etape } from 'src/etapes/entities/etape.entity';
import { Student } from 'src/students/entities/student.entity';
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';

@Entity({ name: 'modules' })
export class Unit {
  @Column({ primary: true })
  module_code: string;

  @Column()
  module_name: string;

  @ManyToMany(() => Etape, (etape) => etape.modules, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinTable({
    name: 'modules_etapes',
    joinColumn: {
      name: 'module',
      referencedColumnName: 'module_code',
    },
    inverseJoinColumn: {
      name: 'etape',
      referencedColumnName: 'etape_code',
    },
  })
  etapes: Etape[];

  @ManyToMany(() => Student, (student) => student.modules)
  students: Student[];
}
