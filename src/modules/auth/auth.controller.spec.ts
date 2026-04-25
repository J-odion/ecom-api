import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn().mockResolvedValue({ _id: '123', email: 'test@test.com' }),
            login: jest.fn().mockReturnValue({ access_token: 'token' }),
            register: jest.fn().mockResolvedValue({ _id: '123', email: 'test@test.com' }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return a token on login', async () => {
    const res = await controller.login({ email: 'test@test.com', password: 'password123' });
    expect(res).toEqual({ access_token: 'token' });
    expect(authService.validateUser).toHaveBeenCalled();
  });

  it('should register a user', async () => {
    const res = await controller.signup({ email: 'test@test.com', password: 'password123' });
    expect(res).toEqual({ _id: '123', email: 'test@test.com' });
    expect(authService.register).toHaveBeenCalled();
  });
});
