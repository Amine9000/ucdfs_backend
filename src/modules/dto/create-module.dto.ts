export class CreateModuleDto {
  module_code: string;
  module_name: string;
  etape_code: string;
}

export class CreateModuleEtapesDto {
  module_code: string;
  module_name: string;
  etape_codes: string[];
}
