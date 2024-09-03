import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { jwtConstants } from '../constants/jwtConstants';
import { Student } from 'src/students/entities/student.entity';
import { User } from 'src/users/entities/user.entity';
import { DataSource } from 'typeorm';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private datasource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtConstants.secret,
      });
      if (payload.email) {
        const userRepository = this.datasource.getRepository(User);
        const user = await userRepository.findOne({
          where: { user_email: payload.email },
          relations: ['roles'],
        });
        if (!user) return false;
        request['user'] = {
          ...user,
          roles: user.roles.map((role) => role.role_name),
        };
      }
      if (payload.cne) {
        const studentRepository = this.datasource.getRepository(Student);
        const student = await studentRepository.findOne({
          where: { student_cne: payload.cne },
        });
        if (!student) return false;
        request['user'] = {
          ...student,
          roles: ['student'],
        };
      }
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
