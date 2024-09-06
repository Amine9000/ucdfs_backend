import { FileBuilder } from './interfaces/FileBuilder';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { join } from 'path';
import { archiveFolder } from 'zip-lib';
import { rimrafSync } from 'rimraf';
import * as fs from 'fs';
import { v4 } from 'uuid';

export class FileCreatorService {
  private readonly logger = new Logger(FileCreatorService.name);
  fBuilder: FileBuilder;
  constructor() {}
  async create(
    data: any[] | object[],
    etapeName: string,
    etape_code: string,
    groupNum: number,
    sectionsNbr: number,
    session: string,
  ) {
    // groups number validation
    if (groupNum == 0)
      return new HttpException(
        'number of groups is Zero.',
        HttpStatus.BAD_REQUEST,
      );

    if (groupNum > data.length)
      return new HttpException(
        'number of groups is greater than number of studnets.',
        HttpStatus.BAD_REQUEST,
      );

    const sections: Map<number, object[][]> = this.devideDataIntoSection(
      data,
      groupNum,
      sectionsNbr,
    );
    // else sections = this.devideData(data, groupNum);
    const zipPath = this.saveSectionsAsZipFile(
      sections,
      etape_code,
      session,
      etapeName,
    );
    return zipPath;
  }

  devideDataIntoSection(
    data: object[],
    groupNum: number,
    sectionsNbr: number,
  ): any {
    let start = 0;
    const sectionLength = Math.ceil(data.length / sectionsNbr);
    const sections = new Map<number, object[][]>();
    for (let i = 0; i < sectionsNbr; i++) {
      let end = start + sectionLength;
      if (end > data.length) end = data.length;
      const piece = data.slice(start, end);
      const groups = this.devideData(piece, groupNum);
      sections.set(i, groups);
      start = end;
    }
    return sections;
  }

  async saveSectionsAsZipFile(
    sections: Map<number, object[][]>,
    etape_code: string,
    session?: string,
    etapeName?: any,
  ) {
    const dirPath = join(__dirname, '..', '..', '..', 'downloads');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }
    const tempDirName = v4();
    const temDirPath = join(dirPath, tempDirName);

    if (!fs.existsSync(temDirPath)) {
      fs.mkdirSync(temDirPath);
    }
    sections.forEach(async (groups, index) => {
      let folderPath = temDirPath;
      const sectionNum = sections.size > 1 ? index + 1 : 0;
      if (sections.size > 1) {
        const folderName = etape_code + '-section-' + sectionNum;
        folderPath = join(temDirPath, folderName);
      }
      await this.saveGroupsAsZipFile(
        groups,
        etape_code,
        session,
        folderPath,
        etapeName,
        sectionNum,
      );
    });
    const zipPath = join(dirPath, tempDirName + '.zip');
    await this.zipDir(temDirPath, zipPath);

    // remove temp dir
    if (fs.existsSync(temDirPath)) {
      rimrafSync(temDirPath);
    }
    return zipPath;
  }

  async saveGroupsAsZipFile(
    groups: object[][],
    etape_code: string,
    session?: string,
    folderPath?: string,
    etapeName?: any,
    sectionNum?: number,
  ) {
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
    groups.forEach(async (group: object[], index) => {
      const groupNum = index + 1;
      const fileName =
        etape_code + '-group-' + groupNum + '.' + this.fBuilder.ext;

      const filePath = join(folderPath, fileName);
      await this.saveToFile(
        group.map((group, i) => ({ ...group, Numero: i + 1 })),
        filePath,
        session,
        groupNum,
        etapeName,
        sectionNum,
      ); // index + 1 is the number of the group
    });
  }

  async zipDir(temDirPath: string, zipPath: string) {
    try {
      await archiveFolder(temDirPath, zipPath);
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  devideData(data: object[], groupNum: number) {
    let start = 0;
    const groupLength = Math.ceil(data.length / groupNum);
    const groups = [];
    for (let i = 0; i < groupNum; i++) {
      let end = start + groupLength;
      if (end > data.length) end = data.length;
      const piece = data.slice(start, end);
      groups.push(piece);
      start = end;
    }
    return groups;
  }

  async saveToFile(
    data: object[],
    path: string,
    session?: string,
    groupNum?: number,
    etapeName?: any,
    sectionNum?: number,
  ) {
    if (this.fBuilder == null)
      throw new HttpException('No builder found', HttpStatus.BAD_GATEWAY + 1);
    await this.fBuilder.build(
      data,
      path,
      session,
      groupNum,
      etapeName,
      sectionNum,
    );
  }
  setBuilder(pdfFileService: FileBuilder) {
    this.fBuilder = pdfFileService;
  }
}
