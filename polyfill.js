// ES2023 Array and URL Polyfills for Node 18 compatibility with Expo SDK 57

// 1. URL.canParse
if (typeof URL !== 'undefined' && !URL.canParse) {
  URL.canParse = function(url, base) {
    try {
      new URL(url, base);
      return true;
    } catch {
      return false;
    }
  };
}

// 2. Array.prototype.toReversed
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function() {
    return this.slice().reverse();
  };
}

// 3. Array.prototype.toSorted
if (!Array.prototype.toSorted) {
  Array.prototype.toSorted = function(compareFn) {
    return this.slice().sort(compareFn);
  };
}

// 4. Array.prototype.toSpliced
if (!Array.prototype.toSpliced) {
  Array.prototype.toSpliced = function(start, deleteCount, ...items) {
    const copy = this.slice();
    copy.splice(start, deleteCount, ...items);
    return copy;
  };
}

// 5. Array.prototype.with
if (!Array.prototype.with) {
  Array.prototype.with = function(index, value) {
    const copy = this.slice();
    copy[index] = value;
    return copy;
  };
}

// 6. util.styleText (Node 20.12+ backport for Node 18 Metro reporter)
try {
  const util = require('util');
  if (!util.styleText) {
    util.styleText = function(format, text) {
      return text;
    };
  }
} catch (e) {}

