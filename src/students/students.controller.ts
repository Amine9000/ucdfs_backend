import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@Controller('students')
@UseGuards(AuthGuard, RolesGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  @Get('etape/:etape_code')
  async findAllByEtape(
    @Param('etape_code') etape_code: string,
    @Query('skip', ParseIntPipe) skip: number,
    @Query('take', ParseIntPipe) take: number,
  ) {
    const data = await this.studentsService.findAllByEtape(
      etape_code,
      skip,
      take,
    );
    return data;
  }

  @Get('validation/:etape_code')
  async studentsValidationByEtape(
    @Param('etape_code') etape_code: string,
    @Query('skip', ParseIntPipe) skip: number,
    @Query('take', ParseIntPipe) take: number,
  ) {
    const data = await this.studentsService.studentsValidationByEtape(
      etape_code,
      skip,
      take,
    );
    return data;
  }

  @Get('search/:etape_code')
  async search(
    @Param('etape_code') etape_code: string,
    @Query('q') search_query: string,
    @Query('skip', ParseIntPipe) skip: number,
    @Query('take', ParseIntPipe) take: number,
  ) {
    const data = await this.studentsService.search(
      etape_code,
      search_query,
      skip,
      take,
    );
    return data;
  }

  @Get('search/students/:etape_code')
  async searchStudents(
    @Param('etape_code') etape_code: string,
    @Query('q') search_query: string,
    @Query('skip', ParseIntPipe) skip: number,
    @Query('take', ParseIntPipe) take: number,
  ) {
    const data = await this.studentsService.searchStudents(
      etape_code,
      search_query,
      skip,
      take,
    );
    return data;
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.studentsService.findOne(code);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(id, updateStudentDto);
  }

  @Delete(':cne')
  removeByCne(@Param('cne') cne: string) {
    return this.studentsService.removeByCne(cne);
  }
}
