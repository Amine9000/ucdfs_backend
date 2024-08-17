export class CreateDemandeDto {
  service_id: string;
  user_id?: string;
  student_id?: string;
  fieldsValues: FieldValue[];
}

export class FieldValue {
  field_id: string;
  value: string;
}
