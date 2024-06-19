import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  StreamableFile,
  ParseIntPipe,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { UpdateFileDto } from './dto/update-file.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';
import { v4 } from 'uuid';
import { createReadStream } from 'fs';
import * as fs from 'fs';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: resolve('../uploads'),
        filename: (req, file, callback) => {
          const extName = extname(file.originalname);
          const filename =
            file.originalname.split('.')[0] + '-' + v4() + extName;
          callback(null, filename);
        },
      }),
    }),
  )
  create(@UploadedFile() file: Express.Multer.File) {
    return this.filesService.create(file);
  }

  @Post('/download/:etape_code')
  async getStudentsValidationFiles(
    @Param('etape_code') etape_code: string,
    @Body('groupNum', ParseIntPipe) groupNum: number,
  ) {
    const output = await this.filesService.getStudentsValidationFiles(
      etape_code,
      groupNum,
    );
    if (typeof output != 'string') return output;
    const file = createReadStream(output);

    file.on('end', () => {
      fs.unlink(output, (err) => {
        if (err) {
          console.error(err);
        }
      });
    });

    return new StreamableFile(file);
  }

  @Get()
  findAll() {
    return this.filesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.filesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFileDto: UpdateFileDto) {
    return this.filesService.update(+id, updateFileDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.filesService.remove(+id);
  }
}
