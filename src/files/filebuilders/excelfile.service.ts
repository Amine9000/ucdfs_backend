import { FileBuilder } from '../interfaces/FileBuilder';
import * as xlsx from 'xlsx';

export class ExcelFileService implements FileBuilder {
  ext: 'pdf' | 'xlsx' = 'xlsx';
  async build(data: object[], path: string): Promise<void> {
    // fill empty cells
    data = data.map((row) => {
      const newRow = {};
      for (const key in row) {
        newRow[key] = row[key] || '--';
      }
      return newRow;
    });
    // Convert JSON to worksheet
    const worksheet = xlsx.utils.json_to_sheet(data);

    // Create a new workbook and append the worksheet
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Write the workbook to a file
    xlsx.writeFile(workbook, path);
  }
}
