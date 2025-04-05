import { IPriorityQueue } from './queue-interface';
import { Queue } from './queue';

export class PriorityQueue<T> implements IPriorityQueue<T> {
  private queue: Queue<{ priority: number; value: T }>;

  constructor() {
    this.queue = new Queue<{ priority: number; value: T }>();
  }

  enqueue(value: T, priority: number): void {
    this.queue.enqueue({ priority, value });
  }

  dequeue(): T | null {
    if (this.isEmpty()) {
      return null;
    }

    let highestPriority = -Infinity;
    let highestPriorityItem: { priority: number; value: T } | null = null;
    const tempQueue = new Queue<{ priority: number; value: T }>();

    // Find the highest priority item
    while (!this.queue.isEmpty()) {
      const item = this.queue.dequeue()!;
      if (item.priority > highestPriority) {
        highestPriority = item.priority;
        highestPriorityItem = item;
      }
      tempQueue.enqueue(item);
    }

    // Rebuild the queue without the highest priority item
    while (!tempQueue.isEmpty()) {
      const item = tempQueue.dequeue()!;
      if (
        item.priority !== highestPriorityItem!.priority ||
        item.value !== highestPriorityItem!.value
      ) {
        this.queue.enqueue(item);
      }
    }

    return highestPriorityItem ? highestPriorityItem.value : null;
  }

  peek(): T | null {
    if (this.isEmpty()) {
      return null;
    }

    let highestPriority = -Infinity;
    let highestPriorityValue: T | null = null;
    const tempQueue = new Queue<{ priority: number; value: T }>();

    // Find the highest priority item without removing it
    while (!this.queue.isEmpty()) {
      const item = this.queue.dequeue()!;
      if (item.priority > highestPriority) {
        highestPriority = item.priority;
        highestPriorityValue = item.value;
      }
      tempQueue.enqueue(item);
    }

    // Restore the original queue
    while (!tempQueue.isEmpty()) {
      this.queue.enqueue(tempQueue.dequeue()!);
    }

    return highestPriorityValue;
  }

  isEmpty(): boolean {
    return this.queue.isEmpty();
  }

  get length(): number {
    return this.queue.length;
  }

  fromArray(arr: { value: T; priority: number }[]): void {
    arr.forEach((item) => this.enqueue(item.value, item.priority));
  }

  toArray(): { value: T; priority: number }[] {
    const arr: { value: T; priority: number }[] = [];
    const tempQueue = new Queue<{ priority: number; value: T }>();

    // Copy all items to the array and temporary queue
    while (!this.queue.isEmpty()) {
      const item = this.queue.dequeue();
      if (item) {
        arr.push({ value: item.value, priority: item.priority });
        tempQueue.enqueue(item);
      }
    }

    // Restore the original queue
    while (!tempQueue.isEmpty()) {
      const item = tempQueue.dequeue();
      if (item) {
        this.queue.enqueue(item);
      }
    }

    return arr;
  }

  clear(): void {
    this.queue.clear();
  }
}
