import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SignInDto } from './dto/signIn.dto';
import { UsersService } from 'src/users/users.service';
import { SignUpDto } from './dto/signUp.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}
  async signIn(signInDto: SignInDto) {
    const user = await this.usersService.findOneByEmail(signInDto.email);
    if (!user)
      return new HttpException(
        `No user with the EMAIL : ${signInDto.email} exists.`,
        HttpStatus.BAD_REQUEST,
      );
    const isSamePwd = await bcrypt.compare(
      signInDto.password,
      user.user_password,
    );
    if (isSamePwd) {
      const payload = {
        sub: user.user_id,
        email: user.user_email,
        roles: user.roles.map((role) => role.role_name),
      };
      delete user.user_password;
      delete user.user_id;

      return {
        access_token: await this.jwtService.signAsync(payload),
        user: { ...user, roles: user.roles.map((role) => role.role_name) },
      };
    } else {
      return new HttpException(
        `Invalid password for the EMAIL : ${signInDto.email}.`,
        HttpStatus.BAD_REQUEST + 1,
      );
    }
  }

  signUp(signUpDto: SignUpDto) {
    return this.usersService.create({
      ...signUpDto,
      user_avatar_path: 'avatars/default.svg',
    });
  }
}
