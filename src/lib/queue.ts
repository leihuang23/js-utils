class QueueNode<T> {
  value: T;
  next: QueueNode<T> | null;

  constructor(value: T) {
    this.value = value;
    this.next = null;
  }
}

export class Queue<T> {
  private head: QueueNode<T> | null;
  private tail: QueueNode<T> | null;
  private size: number;

  constructor() {
    this.head = null;
    this.tail = null;
    this.size = 0;
  }

  get length(): number {
    return this.size;
  }

  enqueue(value: T): void {
    const newNode = new QueueNode<T>(value);
    if (this.tail) {
      this.tail.next = newNode;
    }
    this.tail = newNode;
    if (!this.head) {
      this.head = newNode;
    }
    this.size++;
  }

  dequeue(): T | null {
    if (!this.head) {
      return null;
    }
    const value = this.head.value;
    this.head = this.head.next;
    if (!this.head) {
      this.tail = null;
    }
    this.size--;
    return value;
  }

  peek(): T | null {
    return this.head ? this.head.value : null;
  }

  isEmpty(): boolean {
    return this.size === 0;
  }

  fromArray(arr: T[]): void {
    arr.forEach((item) => this.enqueue(item));
  }

  toArray(): T[] {
    const result: T[] = [];
    let currentNode = this.head;
    while (currentNode) {
      result.push(currentNode.value);
      currentNode = currentNode.next;
    }
    return result;
  }

  clear(): void {
    this.head = null;
    this.tail = null;
    this.size = 0;
  }
}
