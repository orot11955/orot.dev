import type { ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter';

jest.mock('../../logging/logger', () => ({
  __logMock: jest.fn(),
  createLogger: function createLogger() {
    const { __logMock } = jest.requireMock('../../logging/logger');

    return {
      log: __logMock,
    };
  },
}));

jest.mock('../../logging/request-context', () => ({
  __updateRequestContextMock: jest.fn(),
  updateRequestContext: function updateRequestContext(...args: unknown[]) {
    const { __updateRequestContextMock } = jest.requireMock(
      '../../logging/request-context',
    );

    return __updateRequestContextMock(...args);
  },
}));

const { __logMock: logMock } = jest.requireMock('../../logging/logger');
const { __updateRequestContextMock: updateRequestContextMock } =
  jest.requireMock('../../logging/request-context');

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    logMock.mockReset();
    updateRequestContextMock.mockReset();
  });

  function createHost({
    request,
    response,
  }: {
    request?: Record<string, unknown>;
    response?: Record<string, unknown>;
  }): ArgumentsHost {
    const req = {
      originalUrl: '/api/editor/posts/1',
      url: '/api/editor/posts/1',
      requestId: 'req_test',
      ...request,
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      ...response,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    } as ArgumentsHost;
  }

  it('returns 413 for payload-too-large parser errors', () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = createHost({ response });
    const error = Object.assign(new Error('request entity too large'), {
      name: 'PayloadTooLargeError',
      status: 413,
      type: 'entity.too.large',
    });

    filter.catch(error, host);

    expect(response.status).toHaveBeenCalledWith(413);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 413,
        path: '/api/editor/posts/1',
        message: 'request entity too large',
        error: 'PayloadTooLargeError',
        requestId: 'req_test',
      }),
    );
    expect(logMock).toHaveBeenCalledWith(
      'warn',
      'http.request.failed',
      expect.objectContaining({
        statusCode: 413,
        path: '/api/editor/posts/1',
        message: 'request entity too large',
      }),
      error,
    );
  });

  it('keeps generic 500 responses for unexpected errors', () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = createHost({ response });
    const error = new Error('database blew up');

    filter.catch(error, host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 500,
        message: 'Internal server error',
        error: 'Error',
      }),
    );
  });
});
