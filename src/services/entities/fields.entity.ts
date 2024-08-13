import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Service } from './service.entity';

@Entity({ name: 'service_fields' })
export class ServiceFields {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  type: string;

  @Column({ nullable: true, default: null })
  min?: string;

  @Column({ nullable: true, default: null })
  max?: string;

  @Column({ default: true })
  required: boolean;

  @ManyToOne(() => Service, (service) => service.fields, {
    onDelete: 'CASCADE',
  })
  service: Service;
}
