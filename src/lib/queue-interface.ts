/**
 * Base interface with common queue operations
 */
export interface IQueueBase<T> {
  /**
   * Returns the number of elements in the queue
   */
  readonly length: number;
  
  /**
   * Removes and returns the next element from the queue
   * Returns null if the queue is empty
   */
  dequeue(): T | null;
  
  /**
   * Returns the next element without removing it
   * Returns null if the queue is empty
   */
  peek(): T | null;
  
  /**
   * Checks if the queue is empty
   */
  isEmpty(): boolean;
  
  /**
   * Removes all elements from the queue
   */
  clear(): void;
}

/**
 * Standard queue interface
 */
export interface IQueue<T> extends IQueueBase<T> {
  /**
   * Adds an element to the queue
   */
  enqueue(value: T): void;
  
  /**
   * Adds multiple elements to the queue
   */
  fromArray(arr: T[]): void;
  
  /**
   * Returns all elements as an array
   */
  toArray(): T[];
}

/**
 * Priority queue interface
 */
export interface IPriorityQueue<T> extends IQueueBase<T> {
  /**
   * Adds an element to the queue with a specified priority
   */
  enqueue(value: T, priority: number): void;
  
  /**
   * Returns all elements as an array with their priorities
   */
  toArray(): { value: T; priority: number }[];
  
  /**
   * Adds multiple elements with their priorities to the queue
   */
  fromArray(arr: { value: T; priority: number }[]): void;
}
