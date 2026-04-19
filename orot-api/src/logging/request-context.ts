import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextStore {
  requestId: string;
  source: 'http' | 'job';
  method?: string;
  path?: string;
  ip?: string;
  userAgent?: string;
  userId?: number;
  userRole?: string;
  requestSource?: string;
  clientSessionId?: string;
  jobName?: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContextStore>();

export function runWithRequestContext<T>(
  context: RequestContextStore,
  callback: () => T,
): T {
  return requestContextStorage.run(context, callback);
}

export function getRequestContext(): RequestContextStore | undefined {
  return requestContextStorage.getStore();
}

export function updateRequestContext(
  partial: Partial<RequestContextStore>,
): void {
  const store = requestContextStorage.getStore();
  if (!store) {
    return;
  }

  Object.assign(store, partial);
}
