import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { RolesService } from 'src/roles/roles.service';
import * as passwordGenerator from 'generate-password';
import * as bcrypt from 'bcrypt';
import { saltOrRounds } from './constants/bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly rolesService: RolesService,
  ) {}

  async onModuleInit() {
    await this.rolesService.defaultRoles();
    await this.defaultUsers();
  }

  async defaultUsers() {
    const user = new CreateUserDto();
    user.user_avatar_path = 'avatars/default.jpeg';
    user.user_email = 'admin@gmail.com';
    user.user_fname = 'Super';
    user.user_lname = 'Admin';
    user.user_roles = ['admin'];
    await this.create(user).catch((error) => {
      if (error.status !== HttpStatus.BAD_REQUEST) {
        throw error;
      }
    });
  }
  async create(createUserDto: CreateUserDto) {
    const ExistingUser = await this.usersRepo.findOne({
      where: { user_email: createUserDto.user_email },
    });
    if (ExistingUser)
      throw new HttpException(
        `A user with this email : ${createUserDto.user_email} already exists.`,
        HttpStatus.BAD_REQUEST,
      );

    const { user_roles, ...rest } = createUserDto;
    const user = this.usersRepo.create({ ...rest });
    user.roles = await this.rolesService.findByNames(user_roles);
    if (!user.roles.length) {
      throw new HttpException(
        `One or more roles are invalid: ${user_roles.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    let password: string;
    if (
      !createUserDto.user_password ||
      createUserDto.user_password.length == 0
    ) {
      password = 'admin@123';
      user.user_password = await bcrypt.hash(password, saltOrRounds);
    } else {
      password = createUserDto.user_password;
      user.user_password = await bcrypt.hash(password, saltOrRounds);
    }
    await this.usersRepo.save(user);
    const message = {
      message: `Un nouvel utilisateur a été créé avec succès.`,
    };
    return message;
  }

  async findAll() {
    const users = await this.usersRepo.find({
      relations: ['roles'],
    });
    return users.map((user) => {
      return {
        id: user.user_id,
        avatar: user.user_avatar_path,
        nom: user.user_lname,
        prenom: user.user_fname,
        email: user.user_email,
        roles: user.roles.map((role) => role.role_name),
      };
    });
  }

  findOne(id: string) {
    return this.usersRepo.findOne({
      where: { user_id: id },
    });
  }

  findOneByEmail(email: string) {
    return this.usersRepo.findOne({
      where: { user_email: email },
      relations: ['roles'],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.usersRepo.findOne({
      where: { user_id: id },
      relations: ['roles'],
    });
    if (!user)
      throw new HttpException(
        `There is no user with this ID: ${id}`,
        HttpStatus.BAD_REQUEST,
      );
    if (updateUserDto.user_avatar_path) {
      user.user_avatar_path = updateUserDto.user_avatar_path;
    }
    if (updateUserDto.user_fname) user.user_fname = updateUserDto.user_fname;
    if (updateUserDto.user_lname) user.user_lname = updateUserDto.user_lname;
    if (updateUserDto.user_email) user.user_email = updateUserDto.user_email;
    if (updateUserDto.user_roles) {
      user.roles = await this.rolesService.findByNames(
        updateUserDto.user_roles,
      );
    }
    await this.usersRepo.save(user);

    return { message: `User with ID: ${id} has been updated successfully.` };
  }

  async remove(id: string) {
    const user = await this.usersRepo.findOne({
      where: { user_id: id },
      relations: ['roles'],
    });
    if (!user)
      throw new HttpException(
        `There is no user with this ID: ${id}`,
        HttpStatus.BAD_REQUEST,
      );

    await this.usersRepo.remove(user);

    return { message: `User with ID: ${id} has been deleted successfully.` };
  }

  async search(q: string) {
    try {
      const users = await this.usersRepo
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.roles', 'role')
        .where(
          'user.user_fname LIKE :q OR user.user_lname LIKE :q OR user.user_email LIKE :q',
          {
            q: `%${q}%`,
          },
        )
        .getMany();
      return users.map((user) => ({
        id: user.user_id,
        avatar: user.user_avatar_path,
        nom: user.user_lname,
        prenom: user.user_fname,
        email: user.user_email,
        roles: user.roles.map((role) => role.role_name),
      }));
    } catch (error) {
      throw new HttpException(
        `Error while searching for users: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async regen(id: string) {
    const user = await this.usersRepo.findOne({
      where: { user_id: id },
    });
    if (!user) {
      throw new HttpException(
        `There is no user with this ID: ${id}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const password = passwordGenerator.generate({
      length: 10,
      numbers: true,
    });
    user.user_password = await bcrypt.hash(password, saltOrRounds);
    await this.usersRepo.save(user);
    return {
      message: `Password for user with ID: ${id} has been regenerated successfully.`,
      password,
    };
  }
  async changepwd(id: string, password: string) {
    const user = await this.usersRepo.findOne({
      where: { user_id: id },
    });
    if (!user) {
      return { message: 'user not found', success: false };
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    user.user_password = hashedPassword;
    user.is_first_login = false;
    await this.usersRepo.save(user);
    return {
      password: password,
      message: 'Password regenerated successfully',
      success: true,
    };
  }
}
