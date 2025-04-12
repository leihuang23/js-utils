/**
 * List data structure with O(1) prepend and O(1) random access
 * Implemented as a circular buffer with automatic resize
 */
export class List {
  static create(initialCapacity = 16) {
    const list = new List(initialCapacity);
    return new Proxy(list, {
      get(target, prop) {
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
          return target.get(parseInt(prop));
        }
        return target[prop];
      },
    });
  }

  constructor(initialCapacity = 16) {
    this.initialCapacity = initialCapacity;
    this._capacity = initialCapacity;
    this._buffer = new Array(initialCapacity).fill(null);
    this._head = Math.floor(initialCapacity / 2); // Start in the middle
    this._tail = this._head - 1;
    this.length = 0;
  }

  /**
   * Prepends an item to the beginning of the list
   * @param {*} item - Item to prepend
   * @returns {number} New length of the list
   */
  prepend(item) {
    if (this._head === 0) this._resize();
    this._buffer[--this._head] = item;
    return ++this.length;
  }

  /**
   * Appends an item to the end of the list
   * @param {*} item - Item to append
   * @returns {number} New length of the list
   */
  append(item) {
    if (this._tail === this._capacity - 1) this._resize();
    this._buffer[++this._tail] = item;
    return ++this.length;
  }

  pop() {
    if (this.length === 0) return undefined;
    const item = this._buffer[this._tail];
    this._buffer[this._tail] = null;
    this._tail--;
    this.length--;
    return item;
  }

  /**
   * Gets an item at the specified index
   * @param {number} index - Zero-based index
   * @returns {*} Item at the index or undefined if out of bounds
   */
  get(index) {
    if (index < 0 || index >= this.length) return undefined;
    return this._buffer[this._head + index];
  }

  /**
   * Sets an item at the specified index
   * @param {number} index - Zero-based index
   * @param {*} value - Value to set
   * @returns {boolean} True if successful, false if index out of bounds
   */
  set(index, value) {
    if (index < 0 || index >= this.length) return false;
    this._buffer[this._head + index] = value;
    return true;
  }

  /**
   * Clears the list
   */
  clear() {
    const initialCapacity = this.initialCapacity;
    this._capacity = initialCapacity;
    this._buffer = new Array(initialCapacity).fill(null);
    this._head = Math.floor(initialCapacity / 2);
    this._tail = this._head - 1;
    this.length = 0;
  }

  /**
   * Resizes the internal buffer when needed
   * @private
   */
  _resize() {
    const newCapacity = this._capacity * 2;
    const newBuffer = new Array(newCapacity).fill(null);
    const newHead = Math.floor((newCapacity - this.length) / 2);

    // Copy elements to the new buffer
    for (let i = 0; i < this.length; i++) {
      newBuffer[newHead + i] = this._buffer[this._head + i];
    }

    this._buffer = newBuffer;
    this._head = newHead;
    this._tail = this._head + this.length - 1;
    this._capacity = newCapacity;
  }

  [Symbol.iterator]() {
    let index = 0;
    const list = this;

    return {
      next() {
        if (index < list.length) {
          return { value: list.get(index++), done: false };
        } else {
          return { done: true };
        }
      },
    };
  }

  forEach(callback) {
    for (let i = 0; i < this.length; i++) {
      callback(this.get(i), i);
    }
  }

  map(callback) {
    const result = List.create(this.length);
    for (let i = 0; i < this.length; i++) {
      result.append(callback(this.get(i), i));
    }
    return result;
  }
}
