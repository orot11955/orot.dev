import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { createLogger } from '../../logging/logger';
import { updateRequestContext } from '../../logging/request-context';

const apiLogger = createLogger('orot-api');

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<
      Request & { user?: { id?: number; role?: string } }
    >();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const messagePayload =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';
    const resolvedMessage =
      typeof messagePayload === 'string'
        ? messagePayload
        : 'message' in messagePayload
          ? messagePayload.message
          : messagePayload;
    const resolvedError =
      typeof messagePayload === 'object' &&
      messagePayload !== null &&
      'error' in messagePayload &&
      typeof messagePayload.error === 'string'
        ? messagePayload.error
        : exception instanceof Error
          ? exception.name
          : 'Error';
    const path = request.originalUrl ?? request.url;
    const requestId = request.requestId ?? 'unknown';

    if (request.user?.id !== undefined) {
      updateRequestContext({
        userId: request.user.id,
        userRole: request.user.role,
      });
    }

    apiLogger.log(
      status >= 500 ? 'error' : 'warn',
      'http.request.failed',
      {
        statusCode: status,
        path,
        message: resolvedMessage,
      },
      exception,
    );

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path,
      message: resolvedMessage,
      error: resolvedError,
      requestId,
    };

    response.status(status).json(errorResponse);
  }
}
