import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AdminSignInDto } from './dto/admin-signIn.dto';
import { UsersService } from 'src/users/users.service';
import { AdminSignUpDto } from './dto/admin-signUp.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { StudentSignInDto } from './dto/student-signin.dto';
import { StudentsService } from 'src/students/students.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly studentService: StudentsService,
  ) {}
  async signIn(signInDto: AdminSignInDto) {
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
        user: {
          ...user,
          roles: user.roles.map((role) => role.role_name),
        },
      };
    } else {
      return new HttpException(
        `Invalid password for the EMAIL : ${signInDto.email}.`,
        HttpStatus.BAD_REQUEST + 1,
      );
    }
  }

  signUp(signUpDto: AdminSignUpDto) {
    return this.usersService.create({
      ...signUpDto,
      user_avatar_path: 'avatars/default.jpeg',
    });
  }

  async studentSignIn(signInDto: StudentSignInDto) {
    const student = await this.studentService.findStudentByCne(signInDto.cne);

    if (!student)
      return new HttpException(
        `No user with the CNE : ${signInDto.cne} exists.`,
        HttpStatus.BAD_REQUEST,
      );
    const isSamePwd = await bcrypt.compare(
      signInDto.password,
      student.student_pwd,
    );
    if (isSamePwd) {
      const payload = {
        sub: student.student_cne,
        cin: student.student_cin,
        roles: ['student'],
      };
      delete student.student_pwd;
      delete student.id;

      return {
        access_token: await this.jwtService.signAsync(payload),
        user: {
          user_fname: student.student_fname,
          user_lname: student.student_lname,
          user_cne: student.student_cne,
          user_cin: student.student_cin,
          user_avatar_path: student.student_avatar_path,
          user_birthdate: student.student_birthdate,
          user_code: student.student_code,
          is_first_login: student.is_first_login,
          roles: ['student'],
        },
      };
    } else {
      return new HttpException(
        `Invalid password for the CNE : ${signInDto.cne}.`,
        HttpStatus.BAD_REQUEST + 1,
      );
    }
  }
}
