(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    var m = factory();
    root.PlatesDemo = m.demo;
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var utils = {
    /**
     * Extract a Brazilian license plate from raw OCR text.
     * Handles old format (ABC1234) and Mercosul (ABC1D23).
     */
    extractPlateText: function (rawText) {
      if (!rawText || typeof rawText !== 'string') return null;
      var text = rawText.replace(/\s+/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      var mercosul = text.match(/[A-Z]{3}\d[A-Z]\d{2}/);
      if (mercosul) return mercosul[0];
      var old = text.match(/[A-Z]{3}\d{4}/);
      if (old) return old[0];
      return null;
    },

    /**
     * Format a plate string for display, inserting hyphen at position 3.
     */
    formatPlate: function (plate) {
      if (!plate) return '';
      if (plate.length === 7) return plate.slice(0, 3) + '-' + plate.slice(3);
      return plate;
    },

    /**
     * Returns true for valid old or Mercosul Brazilian plate strings.
     */
    isValidPlate: function (plate) {
      if (!plate) return false;
      var clean = plate.replace(/[-\s]/g, '').toUpperCase();
      return /^[A-Z]{3}\d[A-Z]\d{2}$/.test(clean) || /^[A-Z]{3}\d{4}$/.test(clean);
    }
  };

  var SAMPLES = [
    { plate: 'ABC1D23', label: 'Mercosul', color: '#539bf5' },
    { plate: 'XYZ5678', label: 'Padrão antigo', color: '#57ab5a' },
    { plate: 'DEF2G34', label: 'Mercosul', color: '#c69026' }
  ];

  var demo = {
    title: 'detecção de placas veiculares',
    _idx: 0,

    mount: function (container) {
      var self = this;
      container.innerHTML = [
        '<div class="demo-layout">',
        '  <div class="demo-canvas-wrap">',
        '    <canvas id="plates-canvas" width="400" height="260"></canvas>',
        '  </div>',
        '  <div class="demo-sidebar">',
        '    <div class="demo-terminal" id="plates-log"></div>',
        '    <div class="demo-controls">',
        '      <button class="demo-btn" id="plates-next">> próxima amostra</button>',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('');

      this._log = container.querySelector('#plates-log');
      this._canvas = container.querySelector('#plates-canvas');

      container.querySelector('#plates-next').addEventListener('click', function () {
        self._idx = (self._idx + 1) % SAMPLES.length;
        self._runDemo(SAMPLES[self._idx]);
      });

      this._print('pipeline: YOLOv8 → crop → Tesseract OCR');
      this._print('');
      this._runDemo(SAMPLES[0]);
      return Promise.resolve();
    },

    unmount: function () { return Promise.resolve(); },

    _print: function (msg) {
      if (!this._log) return;
      var line = document.createElement('div');
      line.className = 'demo-log-line';
      line.textContent = '> ' + msg;
      this._log.appendChild(line);
      this._log.scrollTop = this._log.scrollHeight;
    },

    _runDemo: function (sample) {
      var self = this;
      var ctx = this._canvas.getContext('2d');
      var W = 400, H = 260;

      ctx.fillStyle = '#111318';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#2a2f3a';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(40, 70, 320, 140, 10);
      else ctx.rect(40, 70, 320, 140);
      ctx.fill();
      ctx.fillStyle = '#1e2228';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(90, 48, 220, 120, 6);
      else ctx.rect(90, 48, 220, 120);
      ctx.fill();
      ctx.fillStyle = '#0d1117';
      ctx.beginPath();
      if (ctx.roundRect) { ctx.roundRect(100, 55, 90, 70, 4); ctx.fill(); ctx.beginPath(); ctx.roundRect(210, 55, 90, 70, 4); }
      else { ctx.rect(100, 55, 90, 70); ctx.fill(); ctx.beginPath(); ctx.rect(210, 55, 90, 70); }
      ctx.fill();

      var px = 130, py = 175, pw = 140, ph = 36;
      ctx.fillStyle = '#f0f0d0';
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.strokeRect(px, py, pw, ph);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 17px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(utils.formatPlate(sample.plate), px + pw / 2, py + 24);
      ctx.textAlign = 'left';

      var start = null, dur = 650;
      var bx = px - 5, by = py - 5, bw = pw + 10, bh = ph + 10;

      (function tick(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var ep = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
        var perim = 2 * (bw + bh);
        var drawn = ep * perim;

        ctx.strokeStyle = sample.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        var left = drawn;
        if (left > 0) { var seg = Math.min(left, bw); ctx.moveTo(bx, by); ctx.lineTo(bx + seg, by); left -= seg; }
        if (left > 0) { var seg = Math.min(left, bh); ctx.moveTo(bx + bw, by); ctx.lineTo(bx + bw, by + seg); left -= seg; }
        if (left > 0) { var seg = Math.min(left, bw); ctx.moveTo(bx + bw, by + bh); ctx.lineTo(bx + bw - seg, by + bh); left -= seg; }
        if (left > 0) { var seg = Math.min(left, bh); ctx.moveTo(bx, by + bh); ctx.lineTo(bx, by + bh - seg); }
        ctx.stroke();
        ctx.setLineDash([]);

        if (p < 1) {
          requestAnimationFrame(tick);
        } else {
          ctx.fillStyle = sample.color;
          ctx.font = '10px monospace';
          ctx.fillText('placa  98.3%', bx, by - 5);
          self._print('placa detectada: ' + utils.formatPlate(sample.plate));
          self._print('formato: ' + sample.label);
          self._print('válida: ' + (utils.isValidPlate(sample.plate) ? 'sim ✓' : 'não'));
          self._print('confiança OCR: 98.3%');
          self._print('');
        }
      }(0));
    }
  };

  return { demo: demo, utils: utils };
}));
