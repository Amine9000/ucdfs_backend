import { User } from 'src/users/entities/user.entity';
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'roles' })
export class Role {
  @PrimaryGeneratedColumn('uuid')
  role_id: number;

  @Column({ unique: true })
  role_name: string;

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];
}
