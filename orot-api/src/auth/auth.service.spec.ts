import type { Response } from 'express';
import { AuthService } from './auth.service';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const bcrypt = jest.requireMock('bcryptjs') as {
  compare: jest.Mock;
};

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const jwtService = {
    signAsync: jest.fn(),
  };

  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string | boolean> = {
        'auth.accessSecret': 'access-secret',
        'auth.refreshSecret': 'refresh-secret',
        'auth.accessExpiresIn': '15m',
        'auth.refreshExpiresIn': '30d',
        'cookie.secure': false,
        'cookie.domain': '',
      };

      return values[key];
    }),
  };

  let service: AuthService;
  let response: Pick<Response, 'cookie'>;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthService(
      prisma as never,
      jwtService as never,
      configService as never,
    );

    response = {
      cookie: jest.fn(),
    };

    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      username: 'admin',
      password: 'hashed-password',
      role: 'ADMIN',
    });
    prisma.refreshToken.create.mockResolvedValue({});
    prisma.refreshToken.findMany.mockResolvedValue([]);
    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

    bcrypt.compare.mockResolvedValue(true);
    jwtService.signAsync.mockImplementation(
      async (payload: Record<string, unknown>, options?: { secret?: string }) =>
        options?.secret === 'refresh-secret'
          ? `refresh-${String(payload.jti)}`
          : 'access-token',
    );
  });

  afterEach(() => {
    bcrypt.compare.mockReset();
  });

  it('stores a distinct refresh token for each login', async () => {
    await service.login(
      { username: 'admin', password: 'password' },
      response as Response,
    );
    await service.login(
      { username: 'admin', password: 'password' },
      response as Response,
    );

    const savedTokens = prisma.refreshToken.create.mock.calls.map(
      ([arg]: [{ data: { token: string } }]) => arg.data.token,
    );

    expect(savedTokens).toHaveLength(2);
    expect(new Set(savedTokens).size).toBe(2);
    expect(response.cookie).toHaveBeenCalledTimes(2);
  });
});
