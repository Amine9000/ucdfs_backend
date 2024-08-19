import { State } from '../entities/student-service.entity';

export class UpdateDemandeDto {
  std_srvice_id: string;
  state: State;
}
