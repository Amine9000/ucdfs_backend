import { Unit } from 'src/modules/entities/unit.entity';
import { Column, Entity, OneToMany } from 'typeorm';

@Entity({ name: 'etapes' })
export class Etape {
  @Column({ primary: true })
  etape_code: string;

  @Column()
  etape_name: string;

  @OneToMany(() => Unit, (unit) => unit.etape, {
    cascade: ['remove'],
    onDelete: 'CASCADE',
  })
  modules: Unit[];
}
