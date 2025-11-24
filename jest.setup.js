// Jest setup file to work around Node.js 25 localStorage issue
// This suppresses the localStorage warning
if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  };
}

