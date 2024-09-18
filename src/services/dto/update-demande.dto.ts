import { State } from '../entities/user-service.entity';

export class UpdateDemandeDto {
  std_srvice_id: string;
  state: State;
}
