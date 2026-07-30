import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { Order } from '../orders/schemas/order.schema';
import { SpendLog } from '../media-buyers/schemas/spend-log.schema';
import { Product } from '../products/schemas/product.schema';
import { Transaction } from '../finance/schemas/transaction.schema';
import { Wallet } from '../finance/schemas/wallet.schema';
import { Types } from 'mongoose';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let orderModelMock: any;
  let walletModelMock: any;
  let transactionModelMock: any;

  beforeEach(async () => {
    orderModelMock = {
      countDocuments: jest.fn().mockResolvedValue(3),
    };

    walletModelMock = {
      findOne: jest.fn().mockResolvedValue({ _id: 'wallet1' }),
    };

    transactionModelMock = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { amount: 150 },
        ]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getModelToken(Order.name), useValue: orderModelMock },
        { provide: getModelToken(SpendLog.name), useValue: {} },
        { provide: getModelToken(Product.name), useValue: {} },
        { provide: getModelToken(Transaction.name), useValue: transactionModelMock },
        { provide: getModelToken(Wallet.name), useValue: walletModelMock },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return CS dashboard metrics', async () => {
    const res = await service.getCsDashboard(new Types.ObjectId().toString());
    expect(res).toBeDefined();
    expect(res.todayDeliveries).toBe(3);
    expect(res.todayFollowUpOrders).toBe(3);
    expect(res.earnings).toBe(150);
    expect(res.rating).toBe(100); // 3 delivery / 3 processed * 100
  });
});
