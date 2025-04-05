import { describe, it, expect, beforeEach } from 'vitest';
import { PriorityQueue } from '../../src/lib/priority-queue.js';

describe('PriorityQueue', () => {
  let priorityQueue: PriorityQueue<string>;

  beforeEach(() => {
    priorityQueue = new PriorityQueue<string>();
  });

  it('should initialize with empty state', () => {
    expect(priorityQueue.length).toBe(0);
    expect(priorityQueue.isEmpty()).toBe(true);
    expect(priorityQueue.peek()).toBeNull();
  });

  describe('enqueue', () => {
    it('should add items to the queue with priorities', () => {
      priorityQueue.enqueue('low', 1);
      expect(priorityQueue.length).toBe(1);
      expect(priorityQueue.isEmpty()).toBe(false);
      expect(priorityQueue.peek()).toBe('low');

      priorityQueue.enqueue('high', 10);
      expect(priorityQueue.length).toBe(2);
      expect(priorityQueue.peek()).toBe('high'); // Highest priority should be at the front
    });
  });

  describe('dequeue', () => {
    it('should return null when queue is empty', () => {
      expect(priorityQueue.dequeue()).toBeNull();
    });

    it('should remove and return items in priority order', () => {
      priorityQueue.enqueue('low', 1);
      priorityQueue.enqueue('medium', 5);
      priorityQueue.enqueue('high', 10);

      expect(priorityQueue.dequeue()).toBe('high');
      expect(priorityQueue.length).toBe(2);
      expect(priorityQueue.peek()).toBe('medium');

      expect(priorityQueue.dequeue()).toBe('medium');
      expect(priorityQueue.length).toBe(1);
      expect(priorityQueue.peek()).toBe('low');

      expect(priorityQueue.dequeue()).toBe('low');
      expect(priorityQueue.length).toBe(0);
      expect(priorityQueue.peek()).toBeNull();
      expect(priorityQueue.isEmpty()).toBe(true);
    });

    it('should handle dequeue to empty state correctly', () => {
      priorityQueue.enqueue('item', 1);
      expect(priorityQueue.dequeue()).toBe('item');
      expect(priorityQueue.isEmpty()).toBe(true);
      expect(priorityQueue.peek()).toBeNull();
    });
  });

  describe('peek', () => {
    it('should return the highest priority item without removing it', () => {
      priorityQueue.enqueue('low', 1);
      priorityQueue.enqueue('high', 10);
      
      expect(priorityQueue.peek()).toBe('high');
      expect(priorityQueue.length).toBe(2); // Length should remain unchanged
      
      expect(priorityQueue.peek()).toBe('high'); // Calling peek again should return the same item
    });
  });

  describe('fromArray', () => {
    it('should populate queue from an array of items with priorities', () => {
      priorityQueue.fromArray([
        { value: 'low', priority: 1 },
        { value: 'medium', priority: 5 },
        { value: 'high', priority: 10 }
      ]);
      
      expect(priorityQueue.length).toBe(3);
      expect(priorityQueue.peek()).toBe('high');
      
      expect(priorityQueue.dequeue()).toBe('high');
      expect(priorityQueue.dequeue()).toBe('medium');
      expect(priorityQueue.dequeue()).toBe('low');
    });

    it('should handle empty array', () => {
      priorityQueue.fromArray([]);
      expect(priorityQueue.isEmpty()).toBe(true);
    });
  });

  describe('toArray', () => {
    it('should convert queue to array with priorities', () => {
      priorityQueue.enqueue('low', 1);
      priorityQueue.enqueue('medium', 5);
      priorityQueue.enqueue('high', 10);
      
      const array = priorityQueue.toArray();
      expect(array.length).toBe(3);
      
      // Check that all items are in the array with their priorities
      expect(array).toContainEqual({ value: 'low', priority: 1 });
      expect(array).toContainEqual({ value: 'medium', priority: 5 });
      expect(array).toContainEqual({ value: 'high', priority: 10 });
      
      expect(priorityQueue.length).toBe(3); // Queue should remain unchanged
    });

    it('should return empty array for empty queue', () => {
      expect(priorityQueue.toArray()).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all items from the queue', () => {
      priorityQueue.enqueue('low', 1);
      priorityQueue.enqueue('high', 10);
      
      priorityQueue.clear();
      
      expect(priorityQueue.isEmpty()).toBe(true);
      expect(priorityQueue.length).toBe(0);
      expect(priorityQueue.peek()).toBeNull();
    });
  });
});
