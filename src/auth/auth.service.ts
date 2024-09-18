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
      };
      delete user.user_password;

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
      student.user.user_password,
    );

    if (isSamePwd) {
      const payload = {
        sub: student.user.user_id,
        cne: student.student_cne,
      };
      delete student.user.user_password;

      return {
        access_token: await this.jwtService.signAsync(payload),
        user: {
          user_id: student.user.user_id,
          user_fname: student.user.user_fname,
          user_lname: student.user.user_lname,
          user_cne: student.student_cne,
          user_cin: student.student_cin,
          user_avatar_path: student.user.user_avatar_path,
          user_birthdate: student.student_birthdate,
          user_code: student.student_code,
          is_first_login: student.user.is_first_login,
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
