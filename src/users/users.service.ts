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
    await this.defaultUsers();
  }

  async defaultUsers() {
    const user = new CreateUserDto();
    user.user_avatar_path = 'avatars/default.jpeg';
    user.user_email = 'amine3@gmail.com';
    user.user_fname = 'Amine';
    user.user_lname = 'Bbd';
    user.user_roles = ['students-manager', 'admin'];
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
        `A USER with this EMAIL : ${createUserDto.user_email} already exists.`,
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

    const password = passwordGenerator.generate({
      length: 10,
      numbers: true,
    });
    user.user_password = await bcrypt.hash(password, saltOrRounds);
    await this.usersRepo.save(user);
    const message = {
      message: `New user has been created successfully.`,
      user_password: password,
    };
    this.logger.verbose(message);
    return message;
  }

  findAll() {
    return this.usersRepo.find();
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
    });
    if (!user)
      throw new HttpException(
        `There is no user with this ID: ${id}`,
        HttpStatus.BAD_REQUEST,
      );

    await this.usersRepo.update(id, { ...updateUserDto });

    return { message: `User with ID: ${id} has been updated successfully.` };
  }

  async remove(id: string) {
    const user = await this.usersRepo.findOne({
      where: { user_id: id },
    });
    if (!user)
      throw new HttpException(
        `There is no user with this ID: ${id}`,
        HttpStatus.BAD_REQUEST,
      );

    await this.usersRepo.delete(id);

    return { message: `User with ID: ${id} has been deleted successfully.` };
  }
}
