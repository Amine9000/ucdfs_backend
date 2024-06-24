import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepo: Repository<Role>,
  ) {}

  async create(createRoleDto: CreateRoleDto) {
    const existsRole = await this.rolesRepo.findOne({
      where: { role_name: createRoleDto.role_name },
    });
    if (existsRole)
      throw new HttpException(
        'a role with name already exists.',
        HttpStatus.BAD_REQUEST,
      );

    const role = this.rolesRepo.create({ ...createRoleDto });
    await this.rolesRepo.save(role);
    return { message: `New role has been deleted successfully.` };
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
