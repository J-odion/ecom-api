import { Test, TestingModule } from '@nestjs/testing';
import { LogisticsController } from './logistics.controller';
import { LogisticsService } from './logistics.service';
import { DeliveryStatus } from './schemas/delivery.schema';

describe('LogisticsController', () => {
  let controller: LogisticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LogisticsController],
      providers: [
        {
          provide: LogisticsService,
          useValue: {
            assignDelivery: jest.fn().mockResolvedValue({ _id: '1', status: DeliveryStatus.ASSIGNED }),
            updateStatus: jest.fn().mockResolvedValue({ _id: '1', status: DeliveryStatus.COMPLETED }),
            findAll: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    controller = module.get<LogisticsController>(LogisticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
