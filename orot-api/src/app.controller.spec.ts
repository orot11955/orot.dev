import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(() => {
    appController = new AppController();
  });

  describe('health', () => {
    it('should return an ok health payload', () => {
      expect(appController.getHealth()).toEqual(
        expect.objectContaining({ status: 'ok' }),
      );
    });
  });
});
