import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminSignInDto } from './dto/admin-signIn.dto';
import { AdminSignUpDto } from './dto/admin-signUp.dto';
import { StudentSignInDto } from './dto/student-signin.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('admin/signin')
  AdminSignIn(@Body() signInDto: AdminSignInDto) {
    return this.authService.signIn(signInDto);
  }

  @Post('admin/signup')
  adminSignUp(@Body() signUpDto: AdminSignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('student/signin')
  StudentSignIn(@Body() signInDto: StudentSignInDto) {
    return this.authService.studentSignIn(signInDto);
  }
}
