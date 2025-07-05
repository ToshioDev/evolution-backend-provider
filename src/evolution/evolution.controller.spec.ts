import { Test, TestingModule } from '@nestjs/testing';
import { EvolutionController } from './evolution.controller';

describe('EvolutionController', () => {
  let controller: EvolutionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvolutionController],
    }).compile();

    controller = module.get<EvolutionController>(EvolutionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
