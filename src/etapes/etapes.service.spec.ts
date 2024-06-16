import { Test, TestingModule } from '@nestjs/testing';
import { EtapesService } from './etapes.service';

describe('EtapesService', () => {
  let service: EtapesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EtapesService],
    }).compile();

    service = module.get<EtapesService>(EtapesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
