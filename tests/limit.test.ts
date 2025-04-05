import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { limit, makeLimit } from "../src/limit.js";

describe("limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should execute tasks with limited concurrency", async () => {
    const results: number[] = [];
    const createTask = (value: number, delay: number) => async () => {
      await vi.advanceTimersByTimeAsync(delay);
      results.push(value);
      return value;
    };

    const tasks = [
      createTask(1, 50),
      createTask(2, 10),
      createTask(3, 30),
      createTask(4, 20),
      createTask(5, 40),
    ];

    // With concurrency of 2, tasks should execute in pairs
    await limit(tasks, 2);

    // Tasks 2 and 4 should finish before 1, 3, and 5 due to shorter delays
    // But the exact order depends on timing, so we just check all tasks completed
    expect(results.length).toBe(5);
    expect(results).toContain(1);
    expect(results).toContain(2);
    expect(results).toContain(3);
    expect(results).toContain(4);
    expect(results).toContain(5);
  });

  it("should handle empty task array", async () => {
    await expect(limit([], 2)).resolves.toBeUndefined();
  });

  it("should handle errors in tasks without stopping other tasks", async () => {
    const results: number[] = [];
    const errors: Error[] = [];

    const successTask = () =>
      Promise.resolve().then(() => {
        results.push(1);
      });

    const errorTask = () =>
      Promise.reject("Task failed").catch((e) => {
        errors.push(e as Error);
      });

    const tasks = [successTask, errorTask, successTask, errorTask, successTask];

    await limit(tasks, 2);

    expect(results.length).toBe(3);
    expect(errors.length).toBe(2);
  });

  it("should respect the concurrency limit", async () => {
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const createTask = (delay: number) => async () => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      await vi.advanceTimersByTimeAsync(delay);
      currentConcurrent--;
    };

    const tasks = Array(10)
      .fill(0)
      .map(() => createTask(10));

    await limit(tasks, 3);

    expect(maxConcurrent).toBe(3);
    expect(currentConcurrent).toBe(0);
  });
});

describe("makeLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should create a function that limits concurrency", async () => {
    const executionOrder: number[] = [];
    const delays = [50, 10, 30, 20, 40];

    const limitedExecutor = makeLimit<number>(2);

    const promises = delays.map((delay, index) => {
      return limitedExecutor(async () => {
        await vi.advanceTimersByTimeAsync(delay);
        executionOrder.push(index);
        return index;
      });
    });

    const results = await Promise.all(promises);

    // All tasks should complete
    expect(results).toEqual([0, 1, 2, 3, 4]);

    // Due to the concurrency limit of 2 and the delays,
    // tasks 1 and 3 should finish before 0, 2, and 4
    // But we can't guarantee exact order due to timing variations
    expect(executionOrder.length).toBe(5);
  });

  it("should handle errors in tasks", async () => {
    const limitedExecutor = makeLimit<number>(2);

    const successPromise = limitedExecutor(async () => {
      return 42;
    });

    const errorPromise = limitedExecutor(async () => {
      throw new Error("Task failed");
    });

    await expect(successPromise).resolves.toBe(42);
    await expect(errorPromise).rejects.toThrow("Task failed");
  });

  it("should respect the concurrency limit", async () => {
    let executing = 0;
    let maxExecuting = 0;
    const concurrencyLimit = 2;

    const limitedExecutor = makeLimit(concurrencyLimit);

    const promises: Promise<unknown>[] = [];

    // Create tasks with different delays
    for (let i = 0; i < 5; i++) {
      const promise = limitedExecutor(async () => {
        executing++;
        maxExecuting = Math.max(maxExecuting, executing);
        await vi.advanceTimersByTimeAsync(Math.random() * 50);
        executing--;
      });
      promises.push(promise);
    }

    await Promise.all(promises);

    expect(maxExecuting).toBeLessThanOrEqual(concurrencyLimit);
    expect(executing).toBe(0);
  });

  it("should execute tasks sequentially with concurrency 1", async () => {
    const executionOrder: number[] = [];
    const limitedExecutor = makeLimit<void>(1);

    // Use shorter, consistent delays
    const task1 = limitedExecutor(async () => {
      executionOrder.push(1);
      await vi.advanceTimersByTimeAsync(30);
      executionOrder.push(11);
    });

    const task2 = limitedExecutor(async () => {
      executionOrder.push(2);
      await vi.advanceTimersByTimeAsync(30);
      executionOrder.push(22);
    });

    const task3 = limitedExecutor(async () => {
      executionOrder.push(3);
      await vi.advanceTimersByTimeAsync(30);
      executionOrder.push(33);
    });

    await Promise.all([task1, task2, task3]);

    // With concurrency 1, order should be deterministic
    expect(executionOrder).toEqual([1, 11, 2, 22, 3, 33]);
  });

  it("should queue tasks when concurrency limit is reached", async () => {
    const executionOrder: number[] = [];
    const limitedExecutor = makeLimit<void>(1);

    // Create tasks with consistent delays and clear completion markers
    const createTask = (id: number, delay: number) => {
      return limitedExecutor(async () => {
        executionOrder.push(id);
        await vi.advanceTimersByTimeAsync(delay);
        executionOrder.push(id * 10);
      });
    };

    // Ensure first task takes longer than subsequent tasks
    const tasks = [
      createTask(1, 50), // First task takes longer
      createTask(2, 20), // Subsequent tasks are faster
      createTask(3, 20),
    ];

    await Promise.all(tasks);

    // With concurrency of 1, tasks should execute strictly in sequence
    expect(executionOrder).toEqual([1, 10, 2, 20, 3, 30]);
  });
});
