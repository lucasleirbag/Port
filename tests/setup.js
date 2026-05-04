global.requestAnimationFrame = (cb) => cb(0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
