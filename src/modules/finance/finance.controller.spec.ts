import { Test, TestingModule } from '@nestjs/testing';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

describe('FinanceController', () => {
  let controller: FinanceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinanceController],
      providers: [
        {
          provide: FinanceService,
          useValue: {
            getWalletBalance: jest.fn().mockResolvedValue(5000),
            getSystemRevenue: jest.fn().mockResolvedValue(100000),
          },
        },
      ],
    }).compile();

    controller = module.get<FinanceController>(FinanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return wallet balance', async () => {
    expect(await controller.getWalletBalance('123')).toBe(5000);
  });
});
