import { Unit } from 'src/modules/entities/unit.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'etapes' })
export class Etape {
  @PrimaryGeneratedColumn('uuid')
  etape_id: string;

  @Column({ unique: true })
  etape_code: string;

  @Column()
  etape_name: string;

  @OneToMany(() => Unit, (unit) => unit.etape, {
    cascade: ['remove'],
    onDelete: 'CASCADE',
  })
  modules: Unit[];
}
