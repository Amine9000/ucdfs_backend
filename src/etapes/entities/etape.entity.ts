import { Unit } from 'src/modules/entities/unit.entity';
import { Column, Entity, OneToMany } from 'typeorm';

@Entity({ name: 'etapes' })
export class Etape {
  @Column({ primary: true })
  code_etape: string;
  @Column()
  version_etape: string;

  @OneToMany(() => Unit, (module) => module.etape)
  modules: Unit[];
}
