import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { In, Repository } from 'typeorm';
import { ROLE } from 'src/auth/enums/Role.enum';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepo: Repository<Role>,
  ) {}
  async defaultRoles() {
    const roles = Object.values(ROLE).map((role) => ({ role_name: role }));

    for (const roleDto of roles) {
      try {
        await this.create(roleDto);
      } catch (error) {
        if (error.status !== HttpStatus.BAD_REQUEST) {
          throw error;
        }
      }
    }
  }

  async create(createRoleDto: CreateRoleDto) {
    const existsRole = await this.rolesRepo.findOne({
      where: { role_name: createRoleDto.role_name },
    });
    if (existsRole)
      throw new HttpException(
        `A role with this name {${existsRole.role_name}} already exists.`,
        HttpStatus.BAD_REQUEST,
      );

    const role = this.rolesRepo.create({ ...createRoleDto });
    await this.rolesRepo.save(role);
    return { message: `New role has been created successfully.` };
  }

  findAll() {
    return this.rolesRepo.find();
  }
  findByNames(role_names: string[]) {
    return this.rolesRepo.find({
      where: { role_name: In(role_names) },
    });
  }

  findOne(id: number) {
    return this.rolesRepo.findOne({
      where: { role_id: id },
    });
  }

  update(id: number, updateRoleDto: UpdateRoleDto) {
    const role = this.rolesRepo.find({
      where: { role_id: id },
    });
    if (!role)
      throw new HttpException(
        `there is no role with this id ${id}`,
        HttpStatus.BAD_REQUEST,
      );

    return this.rolesRepo.update(id, { ...updateRoleDto });
  }

  remove(id: number) {
    const role = this.rolesRepo.find({
      where: { role_id: id },
    });
    if (!role)
      throw new HttpException(
        `there is no role with this id ${id}`,
        HttpStatus.BAD_REQUEST,
      );
    return this.rolesRepo.delete(id);
  }
}
