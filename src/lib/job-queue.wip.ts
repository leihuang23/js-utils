import { PriorityQueue } from './priority-queue';

/**
 * Events that can be emitted by JobQueue
 */
export enum JobQueueEvent {
  EMPTY = 'empty',
  IDLE = 'idle',
  ERROR = 'error',
  COMPLETED = 'completed',
  ADDED = 'added',
  NEXT = 'next',
  PAUSED = 'paused',
  RESUMED = 'resumed',
}

/**
 * Options for configuring a JobQueue
 */
export interface JobQueueOptions {
  concurrency: number;
  timeout?: number;
  autoStart?: boolean;
  intervalCap?: number;
  interval?: number;
}

/**
 * Options for adding a job to the queue
 */
export type JobOptions = {
  priority?: number;
  signal?: AbortSignal;
  id?: string;
};

/**
 * A job function that receives an AbortSignal
 */
export type Job = ({ signal }: { signal: AbortSignal }) => Promise<void>;

/**
 * A queue for limiting concurrent async operations
 */
export class JobQueue {
  private queue: PriorityQueue<{ job: Job; options: Required<JobOptions> }>;
  private running = 0;
  private isPaused = false;
  private isDestroyed = false;
  private intervalCount = 0;
  private intervalId?: ReturnType<typeof setInterval>;
  private jobMap = new Map<
    string,
    {
      priority: number;
      controller?: AbortController;
      timeoutId?: ReturnType<typeof setTimeout>;
    }
  >();
  private eventListeners = new Map<JobQueueEvent, Function[]>();

  constructor(options: JobQueueOptions) {
    this.queue = new PriorityQueue();
    this.concurrency = options.concurrency;
    this.timeout = options.timeout;
    this.autoStart = options.autoStart ?? true;
    this.intervalCap = options.intervalCap;
    this.interval = options.interval;

    if (this.interval && this.intervalCap) {
      this.setupInterval();
    }
  }

  private readonly concurrency: number;
  private readonly timeout?: number;
  private readonly autoStart: boolean;
  private readonly intervalCap?: number;
  private readonly interval?: number;

  /**
   * Sets up the interval for rate limiting
   */
  private setupInterval(): void {
    if (this.isDestroyed) return;

    this.intervalId = setInterval(() => {
      if (this.isDestroyed) {
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = undefined;
        }
        return;
      }
      this.intervalCount = 0;
      this.processNextJobs();
    }, this.interval);
  }

  /**
   * Emits an event with the given arguments
   */
  private emit(event: JobQueueEvent, data?: any): void {
    if (this.isDestroyed) return;

    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        listener(data);
      }
    }
  }

  /**
   * Adds a job to the queue
   */
  add(job: Job, options: JobOptions = {}): string {
    if (this.isDestroyed) {
      return '';
    }

    const id = options.id || Math.random().toString(36).substring(2, 9);
    const priority = options.priority || 0;
    const fullOptions: Required<JobOptions> = {
      priority,
      signal: options.signal || new AbortController().signal,
      id,
    };

    // Store job in map
    this.jobMap.set(id, { priority });

    // Enqueue the job
    this.queue.enqueue({ job, options: fullOptions }, priority);
    this.emit(JobQueueEvent.ADDED, { id });

    if (this.autoStart && !this.isPaused) {
      this.processNextJobs();
    }

    return id;
  }

  /**
   * Processes the next jobs in the queue
   */
  private processNextJobs(): void {
    if (this.isDestroyed || this.isPaused) {
      return;
    }

    if (this.intervalCap && this.intervalCount >= this.intervalCap) {
      return;
    }

    while (
      !this.isDestroyed &&
      !this.isPaused &&
      this.running < this.concurrency &&
      !this.queue.isEmpty() &&
      (!this.intervalCap || this.intervalCount < this.intervalCap)
    ) {
      const item = this.queue.dequeue();
      if (!item) break;

      const { job, options } = item;

      // Check if the job was aborted via its signal
      if (options.signal.aborted) {
        this.emit(JobQueueEvent.NEXT);
        continue;
      }

      this.runJob(job, options);

      if (this.intervalCap) {
        this.intervalCount++;
        if (this.intervalCount >= this.intervalCap) {
          break;
        }
      }
    }

    if (!this.isDestroyed) {
      if (this.queue.isEmpty()) {
        this.emit(JobQueueEvent.EMPTY);
        if (this.running === 0) {
          this.emit(JobQueueEvent.IDLE);
        }
      }
    }
  }

  /**
   * Runs a job with the given options
   */
  private async runJob(job: Job, options: Required<JobOptions>): Promise<void> {
    if (this.isDestroyed) return;

    this.running++;

    // Create a new AbortController for this job
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    // Store the controller in the job map
    const jobInfo = this.jobMap.get(options.id);
    if (jobInfo) {
      this.jobMap.set(options.id, { ...jobInfo, controller });
    }

    // Link with the user-provided signal if any
    if (options.signal.aborted) {
      controller.abort(options.signal.reason);
    } else {
      options.signal.addEventListener('abort', () => {
        controller.abort(options.signal.reason);
      });
    }

    // Set up timeout if specified
    if (this.timeout) {
      timeoutId = setTimeout(() => {
        controller.abort(new Error('Job timeout'));
      }, this.timeout);

      // Store timeoutId in job map
      const jobInfo = this.jobMap.get(options.id);
      if (jobInfo) {
        this.jobMap.set(options.id, { ...jobInfo, timeoutId });
      }
    }

    try {
      if (this.isDestroyed) {
        controller.abort(new Error('Queue destroyed'));
        return;
      }

      this.emit(JobQueueEvent.NEXT, { id: options.id });

      // Check if already aborted before starting
      if (controller.signal.aborted) {
        throw controller.signal.reason || new Error('Job aborted');
      }

      await job({ signal: controller.signal });

      if (!this.isDestroyed) {
        this.emit(JobQueueEvent.COMPLETED, { id: options.id });
      }
    } catch (error) {
      if (!this.isDestroyed) {
        this.emit(JobQueueEvent.ERROR, { error, id: options.id });
      }
    } finally {
      // Clean up
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Remove from job map
      this.jobMap.delete(options.id);
      this.running--;

      // Only process next jobs if not destroyed
      if (!this.isDestroyed && !this.isPaused) {
        this.processNextJobs();
      }
    }
  }

  /**
   * Starts processing jobs in the queue
   */
  start(): JobQueue {
    if (!this.isDestroyed && !this.isPaused) {
      this.processNextJobs();
    }
    return this;
  }

  /**
   * Pauses the queue processing
   */
  pause(): JobQueue {
    if (!this.isDestroyed) {
      this.isPaused = true;
      this.emit(JobQueueEvent.PAUSED);
    }
    return this;
  }

  /**
   * Resumes the queue processing
   */
  resume(): JobQueue {
    if (!this.isDestroyed) {
      this.isPaused = false;
      this.emit(JobQueueEvent.RESUMED);
      this.processNextJobs();
    }
    return this;
  }

  /**
   * Clears all jobs from the queue
   */
  clear(): JobQueue {
    if (!this.isDestroyed) {
      this.queue = new PriorityQueue();

      // Remove all jobs that aren't currently running
      for (const [id, info] of this.jobMap.entries()) {
        if (!info.controller) {
          this.jobMap.delete(id);
        }
      }
    }
    return this;
  }

  /**
   * Gets the total size of the queue
   */
  get size(): number {
    return this.isDestroyed ? 0 : this.queue.length;
  }

  /**
   * Gets the number of running jobs
   */
  get active(): number {
    return this.isDestroyed ? 0 : this.running;
  }

  /**
   * Gets the number of pending jobs
   */
  pending(): number {
    return this.isDestroyed ? 0 : this.queue.length;
  }

  /**
   * Sets the priority of a job with the given ID
   */
  setPriority(id: string, priority: number): boolean {
    if (this.isDestroyed) {
      return false;
    }

    // Check if job exists in the map
    if (!this.jobMap.has(id)) {
      return false;
    }

    // Get the job info from the map
    const jobInfo = this.jobMap.get(id)!;

    // If the job is running, just update the stored priority
    if (jobInfo.controller) {
      this.jobMap.set(id, { ...jobInfo, priority });
      return true;
    }

    // We need to rebuild the queue with the updated priority
    const queueArray = this.queue.toArray();
    this.queue.clear();

    let found = false;

    // Re-enqueue all items with updated priorities
    for (const item of queueArray) {
      const jobItem = item.value;
      if (jobItem.options.id === id) {
        found = true;
        jobItem.options.priority = priority;
        this.queue.enqueue(jobItem, priority);
      } else {
        this.queue.enqueue(jobItem, item.priority);
      }
    }

    // Update the job info in the map
    if (found) {
      this.jobMap.set(id, { priority });
    }

    return found;
  }

  /**
   * Aborts a job with the given ID
   */
  abort(id: string, reason?: any): boolean {
    if (this.isDestroyed) {
      return false;
    }

    // Check if job exists in the map
    if (!this.jobMap.has(id)) {
      return false;
    }

    // Get the job info from the map
    const jobInfo = this.jobMap.get(id)!;

    // If the job is running, abort it using its controller
    if (jobInfo.controller) {
      jobInfo.controller.abort(reason || new Error('Manually aborted'));
      return true;
    }

    // If the job is in the queue, we need to remove it
    const queueArray = this.queue.toArray();
    this.queue.clear();

    let found = false;

    // Re-enqueue all items except the aborted one
    for (const item of queueArray) {
      const jobItem = item.value;
      if (jobItem.options.id === id) {
        found = true;
      } else {
        this.queue.enqueue(jobItem, item.priority);
      }
    }

    // If job was found in the queue, remove it from the map
    if (found) {
      this.jobMap.delete(id);
    }

    return found;
  }

  /**
   * Registers a callback for when the queue becomes empty
   */
  onEmpty(callback: () => void): JobQueue {
    this.on(JobQueueEvent.EMPTY, callback);

    if (!this.isDestroyed && this.queue.isEmpty()) {
      callback();
    }

    return this;
  }

  /**
   * Registers a callback for when the queue becomes idle (empty and no running jobs)
   */
  onIdle(callback: () => void): JobQueue {
    this.on(JobQueueEvent.IDLE, callback);

    if (!this.isDestroyed && this.queue.isEmpty() && this.running === 0) {
      callback();
    }

    return this;
  }

  /**
   * Registers an event listener
   */
  on(event: JobQueueEvent, listener: Function): this {
    if (this.isDestroyed) {
      return this;
    }

    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }

    this.eventListeners.get(event)!.push(listener);
    return this;
  }

  /**
   * Removes an event listener
   */
  off(event: JobQueueEvent, listener: Function): this {
    if (this.isDestroyed) {
      return this;
    }

    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  /**
   * Registers a one-time event listener
   */
  once(event: JobQueueEvent, listener: Function): this {
    if (this.isDestroyed) {
      return this;
    }

    const onceListener = (data: any) => {
      this.off(event, onceListener);
      listener(data);
    };

    return this.on(event, onceListener);
  }

  /**
   * Removes all event listeners
   */
  removeAllListeners(event?: JobQueueEvent): this {
    if (this.isDestroyed) {
      return this;
    }

    if (event) {
      this.eventListeners.delete(event);
    } else {
      this.eventListeners.clear();
    }
    return this;
  }

  /**
   * Cleans up resources when the queue is no longer needed
   */
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    this.isPaused = true;

    // Clear the interval first
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Abort all running jobs and clear timeouts
    for (const [id, jobInfo] of [...this.jobMap.entries()]) {
      if (jobInfo.controller) {
        jobInfo.controller.abort(new Error('Queue destroyed'));
      }
      if (jobInfo.timeoutId) {
        clearTimeout(jobInfo.timeoutId);
      }
    }

    // Clear all state
    this.jobMap.clear();
    this.queue = new PriorityQueue();
    this.eventListeners.clear();
    this.running = 0;
    this.intervalCount = 0;
  }
}
