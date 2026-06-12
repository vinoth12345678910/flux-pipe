import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";

const asyncLocalStorage = new AsyncLocalStorage<Map<string, string>>();

export function generateTraceId(): string {
  return randomUUID();
}

export function getTraceId(): string | undefined {
  const store = asyncLocalStorage.getStore();
  return store?.get("traceId");
}

export function setTraceId(traceId: string): void {
  const store = asyncLocalStorage.getStore();
  store?.set("traceId", traceId);
}

export function runWithTraceId<T>(traceId: string, fn: () => T): T {
  const store = new Map<string, string>();
  store.set("traceId", traceId);
  return asyncLocalStorage.run(store, fn);
}
