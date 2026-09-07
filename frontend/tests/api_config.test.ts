import { test, expect } from '@playwright/test';
import { resolveApiBase } from '../app/config';

test.describe('Frontend API Configuration Fail-Closed Invariants', () => {

  const originalEnv = process.env;

  test.beforeEach(() => {
    process.env = { ...originalEnv };
  });

  test.afterEach(() => {
    process.env = originalEnv;
  });

  test('development defaults safely to localhost:8000 when unconfigured', () => {
    (process.env as any).NODE_ENV = 'development';
    delete process.env.NEXT_PUBLIC_API_BASE;
    const resolved = resolveApiBase();
    expect(resolved).toBe('http://localhost:8000');
  });

  test('configured NEXT_PUBLIC_API_BASE is respected in any environment', () => {
    (process.env as any).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_API_BASE = 'https://obstat-service-2ac1d1fb-7da1-46b4-90e.a.run.app';
    const resolved = resolveApiBase();
    expect(resolved).toBe('https://obstat-service-2ac1d1fb-7da1-46b4-90e.a.run.app');
  });

  test('production build/start with missing NEXT_PUBLIC_API_BASE fails loudly and immediately', () => {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_API_BASE;
    expect(() => resolveApiBase()).toThrowError(/\[FATAL CONFIGURATION ERROR\] Missing NEXT_PUBLIC_API_BASE in production build/);
  });

});
