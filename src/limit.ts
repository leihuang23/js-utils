import { Queue } from "./lib/queue.js";

type Task<T> = () => Promise<T>;

/**
 * Limits concurrency of an array of asynchronous tasks.
 * @function limit
 * @param {Array<function(): Promise<any>>} tasks - An array of functions that return promises.
 * @param {number} n - Maximum number of tasks to run concurrently.
 * @returns {Promise<void>} A promise that resolves when all tasks have completed.
 */
export function limit<T>(
  tasks: Array<() => Promise<T>>,
  n: number
): Promise<void> {
  return new Promise((resolve) => {
    let index = 0;
    let active = 0;

    function next(): void {
      if (index >= tasks.length && active === 0) {
        return resolve();
      }

      while (active < n && index < tasks.length) {
        active++;
        const task = tasks[index++];

        task().finally(() => {
          active--;
          next();
        });
      }
    }

    next();
  });
}

/**
 * Creates a function that limits the concurrency of a given asynchronous function.
 * @function makeLimit
 * @param {number} concurrency - Maximum number of concurrent executions allowed.
 * @returns {function(function(): Promise<any>): Promise<any>} A function that takes an async function and returns a promise.
 * The returned promise resolves with the result of the async function or rejects with its error.
 */
export const makeLimit = <T>(concurrency: number) => {
  let running = 0;
  const queue = new Queue<() => Promise<unknown>>();

  const runNext = () => {
    if (queue.length === 0 || running >= concurrency) {
      return;
    }
    const nextTask = queue.dequeue()!;
    running++;
    nextTask().finally(() => {
      running--;
      runNext();
    });
  };
  return (fn: Task<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      queue.enqueue(() => fn().then(resolve).catch(reject));
      runNext();
    });
  };
};
