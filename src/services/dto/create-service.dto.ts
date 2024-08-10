export class CreateServiceDto {
  name: string;
  description: string;
  fields: Field[];
}

export class Field {
  name: string;
  type: string;
  min?: string;
  max?: string;
  required: boolean;
}
