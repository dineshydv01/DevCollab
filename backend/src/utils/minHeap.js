// WHAT: A generic binary min-heap, plus a getTopKByScore() helper built
//       on it for efficiently finding the K highest-scoring items in a
//       list without fully sorting the list.
// WHY implement this from scratch instead of using a library: this is
//      exactly the kind of DSA a technical interview will ask you to
//      explain or even write on a whiteboard — better to own the real
//      implementation than import a black box.
//
// --- Complexity summary (also explained in chat) ---
// insert():       O(log n) — bubbles the new item up to its correct position
// extractMin():   O(log n) — moves the last item to the root, bubbles it down
// peek():         O(1)     — the minimum is always at index 0
// getTopKByScore(): O(n log k) for n items, keeping only k in the heap
//                   at any time — cheaper than a full sort's O(n log n)
//                   when k is small relative to n (our case: k=10,
//                   n could be thousands of developers).
// Space: O(k) for the heap itself, regardless of how large n is.

export class MinHeap {
  constructor(compareFn) {
    this.heap = [];
    // compareFn(a, b) should return a negative number if a < b,
    // zero if equal, positive if a > b — same contract as Array.sort().
    this.compare = compareFn;
  }

  size() {
    return this.heap.length;
  }

  peek() {
    return this.heap[0];
  }

  insert(value) {
    this.heap.push(value);
    this._bubbleUp(this.heap.length - 1);
  }

  extractMin() {
    const min = this.heap[0];
    const last = this.heap.pop();

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._bubbleDown(0);
    }

    return min;
  }

  _bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.compare(this.heap[index], this.heap[parentIndex]) < 0) {
        this._swap(index, parentIndex);
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  _bubbleDown(index) {
    const n = this.heap.length;
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < n && this.compare(this.heap[left], this.heap[smallest]) < 0) smallest = left;
      if (right < n && this.compare(this.heap[right], this.heap[smallest]) < 0) smallest = right;

      if (smallest === index) break;

      this._swap(index, smallest);
      index = smallest;
    }
  }

  _swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }
}

/**
 * Returns the top K items from `items`, ranked descending by
 * scoreFn(item), WITHOUT fully sorting the entire input.
 *
 * HOW: maintains a min-heap of at most K items, ordered by score.
 * For each new item: if the heap isn't full yet, just insert it.
 * Once it's full, only bother inserting if the new item beats the
 * heap's current WORST item (the min) — in which case that worst
 * item gets evicted to make room. This means an item that's worse
 * than everything already kept is rejected in O(1) (a single peek())
 * without ever being pushed into the heap.
 */
export function getTopKByScore(items, k, scoreFn) {
  if (k <= 0) return [];

  const heap = new MinHeap((a, b) => scoreFn(a) - scoreFn(b));

  for (const item of items) {
    if (heap.size() < k) {
      heap.insert(item);
    } else if (scoreFn(item) > scoreFn(heap.peek())) {
      heap.extractMin();
      heap.insert(item);
    }
  }

  // The heap only ever holds K items at this point, so sorting THIS
  // small result set (not the original list) is a cheap O(k log k).
  const result = [];
  while (heap.size() > 0) {
    result.push(heap.extractMin());
  }

  return result.reverse(); // extractMin gives ascending order; we want highest score first
}
