export interface FileBuilder {
  ext: 'pdf' | 'xlsx';
  build(
    data: object[],
    path: string,
    session?: string,
    groupNum?: number,
    etapeName?: any,
    sectionNum?: number,
  ): Promise<void>;
}
