import { describe, it, expect, beforeEach } from 'vitest';
import { Queue } from '../../src/lib/queue.js';

describe('Queue', () => {
  let queue: Queue<number>;

  beforeEach(() => {
    queue = new Queue<number>();
  });

  it('should initialize with empty state', () => {
    expect(queue.length).toBe(0);
    expect(queue.isEmpty()).toBe(true);
    expect(queue.peek()).toBeNull();
  });

  describe('enqueue', () => {
    it('should add items to the queue', () => {
      queue.enqueue(1);
      expect(queue.length).toBe(1);
      expect(queue.isEmpty()).toBe(false);
      expect(queue.peek()).toBe(1);

      queue.enqueue(2);
      expect(queue.length).toBe(2);
      expect(queue.peek()).toBe(1); // First item should still be at the front
    });
  });

  describe('dequeue', () => {
    it('should return null when queue is empty', () => {
      expect(queue.dequeue()).toBeNull();
    });

    it('should remove and return items in FIFO order', () => {
      queue.enqueue(1);
      queue.enqueue(2);
      queue.enqueue(3);

      expect(queue.dequeue()).toBe(1);
      expect(queue.length).toBe(2);
      expect(queue.peek()).toBe(2);

      expect(queue.dequeue()).toBe(2);
      expect(queue.length).toBe(1);
      expect(queue.peek()).toBe(3);

      expect(queue.dequeue()).toBe(3);
      expect(queue.length).toBe(0);
      expect(queue.peek()).toBeNull();
      expect(queue.isEmpty()).toBe(true);
    });

    it('should handle dequeue to empty state correctly', () => {
      queue.enqueue(1);
      expect(queue.dequeue()).toBe(1);
      expect(queue.isEmpty()).toBe(true);
      expect(queue.peek()).toBeNull();
    });
  });

  describe('peek', () => {
    it('should return the front item without removing it', () => {
      queue.enqueue(1);
      queue.enqueue(2);
      
      expect(queue.peek()).toBe(1);
      expect(queue.length).toBe(2); // Length should remain unchanged
      
      expect(queue.peek()).toBe(1); // Calling peek again should return the same item
    });
  });

  describe('fromArray', () => {
    it('should populate queue from an array', () => {
      queue.fromArray([1, 2, 3]);
      
      expect(queue.length).toBe(3);
      expect(queue.peek()).toBe(1);
      
      expect(queue.dequeue()).toBe(1);
      expect(queue.dequeue()).toBe(2);
      expect(queue.dequeue()).toBe(3);
    });

    it('should handle empty array', () => {
      queue.fromArray([]);
      expect(queue.isEmpty()).toBe(true);
    });
  });

  describe('toArray', () => {
    it('should convert queue to array in correct order', () => {
      queue.enqueue(1);
      queue.enqueue(2);
      queue.enqueue(3);
      
      expect(queue.toArray()).toEqual([1, 2, 3]);
      expect(queue.length).toBe(3); // Queue should remain unchanged
    });

    it('should return empty array for empty queue', () => {
      expect(queue.toArray()).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all items from the queue', () => {
      queue.enqueue(1);
      queue.enqueue(2);
      
      queue.clear();
      
      expect(queue.isEmpty()).toBe(true);
      expect(queue.length).toBe(0);
      expect(queue.peek()).toBeNull();
    });
  });
});
