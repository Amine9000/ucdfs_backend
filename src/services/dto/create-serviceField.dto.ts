export class CreateServiceFieldDto {
  id: string;
  name: string;
  type: string;
  min?: string;
  max?: string;
  required: boolean;
  serviceId: string;
}
