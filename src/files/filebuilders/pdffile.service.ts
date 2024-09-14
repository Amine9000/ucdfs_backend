import { FileBuilder } from '../interfaces/FileBuilder';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import { join } from 'path';

export class PdfFileService implements FileBuilder {
  ext: 'pdf' | 'xlsx' = 'pdf';
  width: number;
  height: number;
  startX: number;
  tableMarginTop: number;
  groupInfoMarginTop: number;
  currentY: number;
  gap: number;
  numRowsPerPage: number;
  rowHeight: number;
  numeroWidth: number;
  columnWidth: number;
  paddings: { left: number; top: number };
  margins: { top: number; bottom: number; left: number; right: number };

  constructor() {
    // Initialize default values
    this.width = 595; // A4 width in points
    this.height = 842; // A4 height in points
    this.margins = { top: 20, bottom: 20, left: 20, right: 20 }; // Set default margins
    this.startX = this.margins.left;
    this.tableMarginTop = 170;
    this.groupInfoMarginTop = 60;
    this.currentY = 0;
    this.gap = 1;
    this.numRowsPerPage = 30;
    this.rowHeight = 18;
    this.numeroWidth = 30;
    this.columnWidth = 0;
    this.paddings = {
      left: 2,
      top: 5,
    };
  }
  build(
    data: object[],
    path: string,
    session?: string,
    groupNum?: number,
    etapeName?: any,
    sectionNum?: number,
  ): Promise<void> {
    // Create a new PDF document
    const doc = new PDFDocument({
      size: [this.width, this.height],
      margins: {
        top: this.margins.top,
        bottom: this.margins.bottom,
        left: this.margins.left,
        right: this.margins.right,
      },
    });

    // Pipe the document to a writable stream
    const writeStream = fs.createWriteStream(path);
    doc.pipe(writeStream);
    this.loadFonts(doc);

    // Table headers
    const headers = Object.keys(data[0]);
    this.columnWidth =
      (this.width -
        this.margins.left -
        this.margins.right -
        (headers.length - 1) * this.gap) /
      headers.length;
    const numPages = Math.ceil(data.length / this.numRowsPerPage);
    this.header(doc, session, groupNum, etapeName, sectionNum);
    this.currentY = this.margins.top + this.tableMarginTop;
    for (let i = 0; i < numPages; i++) {
      if (i > 0) {
        doc.addPage();
        this.header(doc, session, groupNum, etapeName, sectionNum);
        this.currentY = this.margins.top + this.tableMarginTop;
      }
      let lastheader = '';
      let currentX = 0;
      headers.forEach((header) => {
        currentX += this.jump(lastheader);
        doc
          .rect(
            this.startX + currentX,
            this.currentY,
            this.getWidth(header),
            this.rowHeight,
          )
          .fill('#dddddd')
          .stroke();
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#001e33')
          .text(
            header == 'Numero' ? 'Nr' : header,
            this.startX + currentX + this.paddings.left,
            this.currentY + this.paddings.top + 1,
            {
              width: this.getWidth(header) - this.paddings.left,
              height: this.rowHeight,
              lineBreak: false,
              ellipsis: true,
              characterSpacing: 1,
            },
          );
        lastheader = header;
      });

      this.currentY += this.rowHeight;

      doc
        .strokeColor('#001e33')
        .moveTo(this.startX, this.currentY)
        .lineTo(
          this.startX +
            headers.length * this.columnWidth +
            (headers.length - 1) * this.gap,
          this.currentY,
        )
        .stroke();
      data
        .slice(i * this.numRowsPerPage, (i + 1) * this.numRowsPerPage)
        .forEach((row, rowIndex) => {
          currentX = 0;
          lastheader = '';
          headers.forEach((header) => {
            currentX += this.jump(lastheader);
            doc
              .rect(
                this.startX + currentX,
                this.currentY,
                this.getWidth(header),
                this.rowHeight,
              )
              .fill(rowIndex % 2 !== 0 ? '#eeeeee' : '#ffffff') // Fill color for the cell background
              .stroke();
            doc
              .fontSize(8)
              .font('robotolight')
              .fillColor(this.colorvalues(String(row[header])))
              .text(
                String(row[header]),
                this.startX + currentX + this.paddings.left,
                this.currentY + this.paddings.top,
                {
                  width: this.getWidth(header),
                  height: this.rowHeight,
                  align: this.alignItem(header),
                  lineBreak: false,
                  ellipsis: true,
                  characterSpacing: 1,
                },
              );
            lastheader = header;
          });
          this.currentY += this.rowHeight;

          doc
            .strokeColor('#001e33')
            .moveTo(this.startX, this.currentY)
            .lineTo(
              this.startX +
                headers.length * this.columnWidth +
                (headers.length - 1) * this.gap,
              this.currentY,
            )
            .stroke();
        });
    }

    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }
  loadFonts(doc: PDFKit.PDFDocument) {
    const fontBold = join(
      __dirname,
      '..',
      '..',
      '..',
      'public',
      'fonts/bold.otf',
    );
    const fontMedium = join(
      __dirname,
      '..',
      '..',
      '..',
      'public',
      'fonts/medium.otf',
    );
    const fontLight = join(
      __dirname,
      '..',
      '..',
      '..',
      'public',
      'fonts/light.otf',
    );
    const robotoLight = join(
      __dirname,
      '..',
      '..',
      '..',
      'public',
      'fonts/light.ttf',
    );
    doc.registerFont('Bold', fontBold);
    doc.registerFont('medium', fontMedium);
    doc.registerFont('light', fontLight);
    doc.registerFont('robotolight', robotoLight);
  }
  header(
    doc: PDFKit.PDFDocument,
    session: string,
    groupNum: number,
    etapeName: any,
    sectionNum: number,
  ) {
    // Add text to the document
    doc
      .font('Bold')
      .fontSize(12)
      .fillColor('#001e33')
      .text("l'Université Chouaïb Doukkali", {
        characterSpacing: 1,
      });
    doc
      .font('Bold')
      .fontSize(12)
      .fillColor('#001e33')
      .text('Faculté des Sciences', {
        characterSpacing: 1,
      });
    doc.font('Bold').fontSize(12).fillColor('#001e33').text('El Jadida', {
      characterSpacing: 1,
    });
    this.currentY = this.margins.top + this.groupInfoMarginTop;
    const group = 'Group ' + groupNum;
    const groupWidth = doc.widthOfString(group, {
      characterSpacing: 1,
    });
    const listText = `les listes de la filière ${etapeName}`;
    const listTextWidth = doc.widthOfString(listText, {
      characterSpacing: 1,
    });
    const sessionText = `Session ${session}`;
    const sessionTextWidth = doc.widthOfString(sessionText, {
      characterSpacing: 1,
    });
    const year = new Date().getFullYear();
    let yearText = '';

    if (session == 'automne')
      yearText = `Année universitaire ${year}-${year + 1}`;
    else yearText = `Année universitaire ${year - 1}-${year}`;

    const yearTextWidth = doc.widthOfString(yearText, {
      characterSpacing: 1,
    });

    doc
      .font('Bold')
      .fontSize(12)
      .fillColor('#004c7f')
      .text(listText, this.width / 2 - listTextWidth / 2, this.currentY, {
        align: 'center',
      });
    doc
      .font('Bold')
      .fontSize(12)
      .fillColor('#001e33')
      .text(
        sessionText,
        this.width / 2 - sessionTextWidth / 2,
        this.currentY + this.rowHeight,
      );
    doc
      .font('Bold')
      .fontSize(12)
      .fillColor('#001e33')
      .text(
        yearText,
        this.width / 2 - yearTextWidth / 2,
        this.currentY + 2 * this.rowHeight,
      );

    if (sectionNum != 0) {
      const sectionText = `Section ${sectionNum}`;
      const sectionTextWidth = doc.widthOfString(sectionText, {
        characterSpacing: 1,
      });
      doc
        .font('Bold')
        .fontSize(12)
        .fillColor('#001e33')
        .text(
          sectionText,
          this.width / 2 - sectionTextWidth / 2,
          this.currentY + 3 * this.rowHeight,
        );
    }
    doc
      .font('Bold')
      .fontSize(12)
      .fillColor('#001e33')
      .text(
        group,
        this.width / 2 - groupWidth / 2,
        this.currentY + (sectionNum == 0 ? 3 : 4) * this.rowHeight,
      );
  }
  alignItem(key: string) {
    if (key == 'Prenom' || key == 'Nom') {
      return 'left';
    } else {
      return 'center';
    }
  }
  getWidth(key: string) {
    if (key == 'Numero') {
      return this.numeroWidth;
    } else if (key == 'Nom' || key == 'Prenom') {
      return this.columnWidth + (this.columnWidth - this.numeroWidth) / 2;
    } else {
      return this.columnWidth;
    }
  }
  jump(lastheader: string) {
    if (lastheader === '') return 0;
    if (lastheader == 'Numero') {
      return this.numeroWidth + this.gap;
    } else if (lastheader == 'Nom' || lastheader == 'Prenom') {
      return (
        this.columnWidth + (this.columnWidth - this.numeroWidth) / 2 + this.gap
      );
    } else {
      return this.columnWidth + this.gap;
    }
  }
  colorvalues(value: string) {
    switch (value) {
      case 'I':
        return '#006bb2';
      case 'NI':
        return '#ff6701';
      default:
        return '#001e33';
    }
  }
}
