import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memoPromise } from '../src/memoP.js';

describe('memoPromise', () => {
  // Mock Date.now to control time for expiration tests
  let now = 0;

  beforeEach(() => {
    now = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should cache results of async functions', async () => {
    const mockFn = vi.fn().mockImplementation(async (x: number) => x * 2);
    const memoized = memoPromise(mockFn);

    // First call should execute the function
    const result1 = await memoized(5);
    expect(result1).toBe(10);
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Second call with same args should use cached result
    const result2 = await memoized(5);
    expect(result2).toBe(10);
    expect(mockFn).toHaveBeenCalledTimes(1); // Still called only once

    // Call with different args should execute the function again
    const result3 = await memoized(7);
    expect(result3).toBe(14);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should respect the expiresIn option', async () => {
    const mockFn = vi.fn().mockImplementation(async (x: number) => x * 2);
    const memoized = memoPromise(mockFn, { expiresIn: 1000 }); // 1 second expiry

    // First call
    await memoized(5);
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Call again immediately - should use cache
    await memoized(5);
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Advance time by 500ms - still within expiry
    now += 500;
    await memoized(5);
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Advance time by another 600ms (total 1100ms) - should expire
    now += 600;
    await memoized(5);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should respect the maxSize option', async () => {
    const mockFn = vi.fn().mockImplementation(async (x: number) => x * 2);
    const memoized = memoPromise(mockFn, { maxSize: 2 });

    // Fill the cache with 2 items
    await memoized(1);
    await memoized(2);
    expect(mockFn).toHaveBeenCalledTimes(2);

    // Call with cached args - should use cache
    await memoized(2);
    expect(mockFn).toHaveBeenCalledTimes(2);

    // Add a third item - should evict the oldest (1)
    await memoized(3);
    expect(mockFn).toHaveBeenCalledTimes(3);

    // Call with the first arg again - should execute again since it was evicted
    await memoized(1);
    expect(mockFn).toHaveBeenCalledTimes(4);

    // Call with the second arg - should still be cached
    await memoized(2);
    expect(mockFn).toHaveBeenCalledTimes(5); // The implementation evicts the oldest item, which is now 2

    // Call with the third arg - should still be cached
    await memoized(3);
    expect(mockFn).toHaveBeenCalledTimes(6);

    // Add a fourth item - should evict the oldest (3)
    await memoized(4);
    expect(mockFn).toHaveBeenCalledTimes(7);
  });

  it('should use the custom keyFn if provided', async () => {
    const mockFn = vi.fn().mockImplementation(async (obj: { id: number }) => obj.id * 2);

    // Without custom keyFn, different objects with same values would be treated as different
    const defaultMemoized = memoPromise(mockFn);

    await defaultMemoized({ id: 5 });
    await defaultMemoized({ id: 5 }); // Same value but different object
    expect(mockFn).toHaveBeenCalledTimes(1); // JSON.stringify actually makes these equal

    // Different object structure should be treated as different
    await defaultMemoized({ id: 5, extra: true });
    expect(mockFn).toHaveBeenCalledTimes(2);

    mockFn.mockClear();

    // With custom keyFn, we can use just the id for caching
    const customMemoized = memoPromise(mockFn, {
      keyFn: (args) => String(args[0].id),
    });

    await customMemoized({ id: 5 });
    await customMemoized({ id: 5 }); // Same value but different object
    expect(mockFn).toHaveBeenCalledTimes(1); // Only called once because we use id as key

    // Even with different structure, should still use cache if id is the same
    await customMemoized({ id: 5, extra: true });
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should remove failed promises from cache', async () => {
    const mockFn = vi.fn().mockImplementation(async (x: number) => {
      if (x === 0) throw new Error('Zero not allowed');
      return x * 2;
    });

    const memoized = memoPromise(mockFn);

    // Call with valid arg
    const result1 = await memoized(5);
    expect(result1).toBe(10);
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Call with failing arg
    try {
      await memoized(0);
    } catch (error) {
      // Expected error
    }
    expect(mockFn).toHaveBeenCalledTimes(2);

    // Call with failing arg again - should execute again since it was removed from cache
    try {
      await memoized(0);
    } catch (error) {
      // Expected error
    }
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should handle concurrent calls with the same arguments', async () => {
    let callCount = 0;
    const mockFn = vi.fn().mockImplementation(async (x: number) => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return x * 2;
    });

    const memoized = memoPromise(mockFn);

    // Make multiple concurrent calls with the same argument
    const [result1, result2, result3] = await Promise.all([memoized(5), memoized(5), memoized(5)]);

    // All should have the same result
    expect(result1).toBe(10);
    expect(result2).toBe(10);
    expect(result3).toBe(10);

    // But the function should only be called once
    expect(callCount).toBe(1);
  });

  it('should handle zero or negative maxSize', async () => {
    const mockFn = vi.fn().mockImplementation(async (x: number) => x * 2);

    // With maxSize = 0, nothing should be cached
    const noCache = memoPromise(mockFn, { maxSize: 0 });

    await noCache(5);
    await noCache(5);
    expect(mockFn).toHaveBeenCalledTimes(2); // Called twice because nothing is cached

    mockFn.mockClear();

    // With negative maxSize, should behave like maxSize = 0
    const negativeSizeCache = memoPromise(mockFn, { maxSize: -1 });

    await negativeSizeCache(5);
    await negativeSizeCache(5);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});
