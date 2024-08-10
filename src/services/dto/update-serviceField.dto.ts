import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceFieldDto } from './create-serviceField.dto';

export class UpdateServiceFieldDto extends PartialType(CreateServiceFieldDto) {}
