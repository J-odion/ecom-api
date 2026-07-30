import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MediaBuyersService } from './media-buyers.service';
import { SpendLog } from './schemas/spend-log.schema';
import { Lead } from '../leads/schemas/lead.schema';
import { Order } from '../orders/schemas/order.schema';
import { User } from '../users/schemas/user.schema';
import { Transaction } from '../finance/schemas/transaction.schema';
import { Wallet } from '../finance/schemas/wallet.schema';
import { Types } from 'mongoose';

describe('MediaBuyersService', () => {
  let service: MediaBuyersService;
  let userModelMock: any;
  let spendLogModelMock: any;
  let leadModelMock: any;
  let orderModelMock: any;
  let walletModelMock: any;
  let transactionModelMock: any;

  beforeEach(async () => {
    userModelMock = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: new Types.ObjectId('60c72b2f9b1d8a2c2c8b4567'), team: 'Team Alpha', role: 'media_buyer' },
        ]),
      }),
    };

    spendLogModelMock = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { amountSpent: 100 },
        ]),
      }),
    };

    leadModelMock = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            { _id: 'lead1' },
          ]),
        }),
      }),
    };

    orderModelMock = {
      countDocuments: jest.fn().mockResolvedValue(5),
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            { totalAmount: 500 },
          ]),
        }),
      }),
    };

    walletModelMock = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: 'wallet1' },
        ]),
      }),
    };

    transactionModelMock = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { amount: 50 },
        ]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaBuyersService,
        { provide: getModelToken(SpendLog.name), useValue: spendLogModelMock },
        { provide: getModelToken(Lead.name), useValue: leadModelMock },
        { provide: getModelToken(Order.name), useValue: orderModelMock },
        { provide: getModelToken(User.name), useValue: userModelMock },
        { provide: getModelToken(Transaction.name), useValue: transactionModelMock },
        { provide: getModelToken(Wallet.name), useValue: walletModelMock },
      ],
    }).compile();

    service = module.get<MediaBuyersService>(MediaBuyersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return team dashboard metrics', async () => {
    const res = await service.getTeamDashboard();
    expect(res).toBeDefined();
    expect(res.length).toBe(1);
    expect(res[0].team).toBe('Team Alpha');
    expect(res[0].spent).toBe(100);
    expect(res[0].orderCounts).toBe(5);
    expect(res[0].earnings).toBe(500);
    expect(res[0].commissions).toBe(50);
  });
});
