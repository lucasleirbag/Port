(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.DemoEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function DemoEngine(options) {
    var opts = options || {};
    this._closeDelay = opts.closeDelay !== undefined ? opts.closeDelay : 220;
    this._registry = new Map();
    this._current = null;
    var self = this;
    this._onKeydown = function (e) {
      if (e.key === 'Escape') self.close();
    };
  }

  DemoEngine.prototype.register = function (id, demo) {
    if (!id || typeof id !== 'string') throw new Error('id must be a non-empty string');
    if (!demo || typeof demo.mount !== 'function') throw new Error('demo must implement mount(container)');
    this._registry.set(id, demo);
    return this;
  };

  DemoEngine.prototype.open = function (id) {
    var self = this;
    var demo = this._registry.get(id);
    if (!demo) return Promise.reject(new Error('Demo "' + id + '" not registered'));

    var prev = this._current ? this.close() : Promise.resolve();
    return prev.then(function () {
      var modal = self._buildModal(id, demo.title || id);
      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', self._onKeydown);
      requestAnimationFrame(function () { modal.classList.add('is-visible'); });

      self._current = { id: id, modal: modal, demo: demo };

      return Promise.resolve()
        .then(function () { return demo.mount(modal.querySelector('[data-slot="content"]')); })
        .catch(function (err) { self._showError(modal, err.message); });
    });
  };

  DemoEngine.prototype.close = function () {
    if (!this._current) return Promise.resolve();
    var self = this;
    var modal = this._current.modal;
    var demo = this._current.demo;
    var delay = this._closeDelay;

    var unmount = (typeof demo.unmount === 'function')
      ? Promise.resolve().then(function () { return demo.unmount(); }).catch(function () {})
      : Promise.resolve();

    return unmount.then(function () {
      modal.classList.remove('is-visible');
      return new Promise(function (resolve) { setTimeout(resolve, delay); });
    }).then(function () {
      modal.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', self._onKeydown);
      self._current = null;
    });
  };

  DemoEngine.prototype.isOpen = function () { return this._current !== null; };
  DemoEngine.prototype.getCurrentId = function () { return this._current ? this._current.id : null; };

  DemoEngine.prototype._buildModal = function (id, title) {
    var self = this;
    var el = document.createElement('div');
    el.className = 'demo-modal';
    el.dataset.demo = id;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = [
      '<div class="demo-modal__backdrop"></div>',
      '<div class="demo-modal__panel">',
      '  <div class="demo-modal__head">',
      '    <span class="demo-modal__title"><span class="dim">// </span>' + title + '</span>',
      '    <button class="demo-modal__close" aria-label="Fechar [Esc]">&#x2715;</button>',
      '  </div>',
      '  <div class="demo-modal__body" data-slot="content"></div>',
      '</div>'
    ].join('');
    el.querySelector('.demo-modal__backdrop').addEventListener('click', function () { self.close(); });
    el.querySelector('.demo-modal__close').addEventListener('click', function () { self.close(); });
    return el;
  };

  DemoEngine.prototype._showError = function (modal, message) {
    var slot = modal.querySelector('[data-slot="content"]');
    if (slot) {
      slot.innerHTML = '<div class="demo-error"><span class="demo-error__label">error:</span> <span class="demo-error__msg">' + message + '</span></div>';
    }
  };

  return DemoEngine;
}));
