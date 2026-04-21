import { PublicSettingsController } from './settings.controller';
import { DEFAULT_SETTINGS, PUBLIC_SETTING_KEYS } from './settings.constants';

describe('PublicSettingsController', () => {
  it('returns only the public settings keys with defaults intact', async () => {
    const settingsService = {
      findAll: jest.fn().mockResolvedValue({
        ...DEFAULT_SETTINGS,
        private_secret: 'should-not-leak',
      }),
    };

    const controller = new PublicSettingsController(settingsService as never);
    const result = await controller.findAll();

    expect(result.home_hero_image_position_y).toBe('50%');
    expect(Object.keys(result).sort()).toEqual([...PUBLIC_SETTING_KEYS].sort());
    expect(result).not.toHaveProperty('private_secret');
  });
});
