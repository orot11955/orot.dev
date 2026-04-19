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

function toHttpStatus(value: unknown): number | undefined {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 400 &&
    value < 600
    ? value
    : undefined;
}

function resolveStatus(exception: unknown): number {
  if (exception instanceof HttpException) {
    return exception.getStatus();
  }

  if (typeof exception === 'object' && exception !== null) {
    const error = exception as { status?: number; statusCode?: number };
    return (
      toHttpStatus(error.statusCode) ??
      toHttpStatus(error.status) ??
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
}

function resolveMessagePayload(exception: unknown, status: number) {
  if (exception instanceof HttpException) {
    return exception.getResponse();
  }

  if (status < 500 && exception instanceof Error) {
    return exception.message;
  }

  return 'Internal server error';
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<
      Request & { user?: { id?: number; role?: string } }
    >();

    const status = resolveStatus(exception);
    const messagePayload = resolveMessagePayload(exception, status);
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
