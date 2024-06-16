import { Test, TestingModule } from '@nestjs/testing';
import { EtapesController } from './etapes.controller';
import { EtapesService } from './etapes.service';

describe('EtapesController', () => {
  let controller: EtapesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EtapesController],
      providers: [EtapesService],
    }).compile();

    controller = module.get<EtapesController>(EtapesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
