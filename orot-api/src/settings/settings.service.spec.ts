import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { SETTING_KEYS } from './settings.constants';

function createPrismaMock() {
  return {
    siteSetting: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  };
}

describe('SettingsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: SettingsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new SettingsService(prisma as unknown as PrismaService);
  });

  it('reuses cached settings for repeated reads', async () => {
    prisma.siteSetting.findMany.mockResolvedValue([
      { key: SETTING_KEYS.SITE_NAME, value: 'Cached Site' },
    ]);

    await expect(service.findAll()).resolves.toMatchObject({
      [SETTING_KEYS.SITE_NAME]: 'Cached Site',
    });
    await expect(service.findAll()).resolves.toMatchObject({
      [SETTING_KEYS.SITE_NAME]: 'Cached Site',
    });

    expect(prisma.siteSetting.findMany).toHaveBeenCalledTimes(1);
  });

  it('invalidates the cache after an update', async () => {
    prisma.siteSetting.findMany
      .mockResolvedValueOnce([
        { key: SETTING_KEYS.SITE_NAME, value: 'Before Update' },
      ])
      .mockResolvedValueOnce([
        { key: SETTING_KEYS.SITE_NAME, value: 'After Update' },
      ]);
    prisma.siteSetting.upsert.mockResolvedValue({
      key: SETTING_KEYS.SITE_NAME,
      value: 'After Update',
    });

    await service.findAll();
    await expect(
      service.upsertOne(SETTING_KEYS.SITE_NAME, 'After Update'),
    ).resolves.toMatchObject({
      [SETTING_KEYS.SITE_NAME]: 'After Update',
    });
    await expect(service.findAll()).resolves.toMatchObject({
      [SETTING_KEYS.SITE_NAME]: 'After Update',
    });

    expect(prisma.siteSetting.findMany).toHaveBeenCalledTimes(2);
  });
});
