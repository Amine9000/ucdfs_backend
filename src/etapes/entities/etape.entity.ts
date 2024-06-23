import { Unit } from 'src/modules/entities/unit.entity';
import { Column, Entity, ManyToMany } from 'typeorm';

@Entity({ name: 'etapes' })
export class Etape {
  @Column({ primary: true })
  etape_code: string;
  @Column()
  etape_name: string;

  @ManyToMany(() => Unit, (module) => module.etapes)
  modules: Unit[];
}
