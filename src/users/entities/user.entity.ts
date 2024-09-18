import { Role } from 'src/roles/entities/role.entity';
import { UserService } from 'src/services/entities/user-service.entity';
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Student } from './students.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  user_id: string;

  @Column()
  user_fname: string;

  @Column()
  user_lname: string;

  @Column({ nullable: true })
  user_email: string;

  @Column()
  user_password: string;

  @Column({ default: true, type: 'boolean' })
  is_first_login: boolean;

  @OneToOne(() => Student, (std) => std.user)
  student: Student;

  @OneToMany(() => UserService, (stdService) => stdService.user)
  services: UserService[];

  @Column({ default: 'avatars/default.jpeg' })
  user_avatar_path: string;

  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'user_id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'role_id' },
  })
  roles: Role[];
}
