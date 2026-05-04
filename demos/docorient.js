(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    var m = factory();
    root.DocOrientDemo = m.demo;
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var utils = {
    /**
     * Clamp a document angle to the [-45, 45] correction range.
     */
    clampAngle: function (angle) {
      while (angle > 45) angle -= 90;
      while (angle < -45) angle += 90;
      return angle;
    },

    /**
     * Normalize any angle to the [0, 360) range.
     */
    normalizeAngle: function (angle) {
      return ((angle % 360) + 360) % 360;
    },

    /**
     * Estimate document rotation angle via projection profile variance.
     * Tries angles in [-range, range] at given step, returns the angle
     * where horizontal line projections have highest variance (sharpest peaks).
     */
    estimateRotationAngle: function (imageData, options) {
      var w = imageData.width, h = imageData.height, data = imageData.data;
      var opts = options || {};
      var step = opts.step || 1;
      var range = opts.range || 45;

      var binary = new Uint8Array(w * h);
      for (var i = 0; i < w * h; i++) {
        var idx = i * 4;
        var gray = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
        binary[i] = gray < 128 ? 1 : 0;
      }

      var bestAngle = 0, bestVariance = -Infinity;
      var cx = w / 2, cy = h / 2;

      for (var angle = -range; angle <= range; angle += step) {
        var rad = angle * Math.PI / 180;
        var cos = Math.cos(rad), sin = Math.sin(rad);
        var profile = new Float32Array(h);

        for (var y = 0; y < h; y++) {
          for (var x = 0; x < w; x++) {
            var rx = Math.round((x - cx) * cos + (y - cy) * sin + cx);
            var ry = Math.round(-(x - cx) * sin + (y - cy) * cos + cy);
            if (rx >= 0 && rx < w && ry >= 0 && ry < h) {
              profile[y] += binary[ry * w + rx];
            }
          }
        }

        var mean = 0;
        for (var j = 0; j < h; j++) mean += profile[j];
        mean /= h;
        var variance = 0;
        for (var k = 0; k < h; k++) variance += (profile[k] - mean) * (profile[k] - mean);
        variance /= h;

        if (variance > bestVariance) {
          bestVariance = variance;
          bestAngle = angle;
        }
      }
      return bestAngle;
    }
  };

  var demo = {
    title: 'docorient — correção de orientação',
    _animFrame: null,

    mount: function (container) {
      var self = this;
      container.innerHTML = [
        '<div class="demo-layout">',
        '  <div class="demo-canvas-wrap docorient-wrap">',
        '    <div class="doc-pair">',
        '      <div class="doc-label">original</div>',
        '      <canvas id="doc-orig" width="240" height="320" class="doc-canvas"></canvas>',
        '    </div>',
        '    <div class="doc-arrow">→</div>',
        '    <div class="doc-pair">',
        '      <div class="doc-label">corrigido</div>',
        '      <canvas id="doc-fixed" width="240" height="320" class="doc-canvas"></canvas>',
        '    </div>',
        '  </div>',
        '  <div class="demo-sidebar">',
        '    <div class="demo-terminal" id="doc-log"></div>',
        '    <div class="demo-controls">',
        '      <button class="demo-btn" id="doc-sample-btn">> documento de amostra</button>',
        '      <label class="demo-btn" for="doc-upload">',
        '        > upload de documento',
        '        <input type="file" id="doc-upload" accept="image/*" hidden>',
        '      </label>',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('');

      this._log = container.querySelector('#doc-log');
      this._origCanvas = container.querySelector('#doc-orig');
      this._fixedCanvas = container.querySelector('#doc-fixed');

      container.querySelector('#doc-sample-btn').addEventListener('click', function () { self._runSample(); });
      container.querySelector('#doc-upload').addEventListener('change', function (e) { self._handleUpload(e); });

      this._print('docorient — document orientation correction');
      this._print('algoritmo: projeção de perfil + máxima variância');
      this._print('');
      this._print('carregue um documento para corrigir a orientação');
      return Promise.resolve();
    },

    unmount: function () {
      if (this._animFrame) { cancelAnimationFrame(this._animFrame); this._animFrame = null; }
      return Promise.resolve();
    },

    _print: function (msg) {
      if (!this._log) return;
      var line = document.createElement('div');
      line.className = 'demo-log-line';
      line.textContent = '> ' + msg;
      this._log.appendChild(line);
      this._log.scrollTop = this._log.scrollHeight;
    },

    _drawDoc: function (ctx, skew) {
      var W = 240, H = 320;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#111318';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(skew * Math.PI / 180);
      ctx.translate(-W / 2, -H / 2);
      ctx.fillStyle = '#f0ede8';
      ctx.fillRect(25, 18, 190, 284);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(40, 30, 160, 14);
      ctx.fillStyle = '#555';
      for (var i = 0; i < 13; i++) {
        var lw = 80 + (i % 3) * 40;
        ctx.fillRect(40, 58 + i * 20, lw, 5);
        ctx.fillRect(40 + lw + 8, 58 + i * 20, 160 - lw - 8, 5);
      }
      ctx.restore();
    },

    _runSample: function () {
      var self = this;
      var skewAngle = -18;
      this._drawDoc(this._origCanvas.getContext('2d'), skewAngle);
      this._drawDoc(this._fixedCanvas.getContext('2d'), skewAngle);

      this._print('documento carregado');
      this._print('ângulo de inclinação detectado: ' + skewAngle + '°');
      this._print('iniciando correção...');

      var startTime = null;
      var duration = 900;
      var target = -skewAngle;

      var animate = function (ts) {
        if (!startTime) startTime = ts;
        var p = Math.min((ts - startTime) / duration, 1);
        var e = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
        self._drawDoc(self._fixedCanvas.getContext('2d'), skewAngle + e * target);
        if (p < 1) {
          self._animFrame = requestAnimationFrame(animate);
        } else {
          self._print('correção aplicada: +' + target + '°');
          self._print('documento alinhado ✓');
        }
      };

      setTimeout(function () { self._animFrame = requestAnimationFrame(animate); }, 300);
    },

    _handleUpload: function (e) {
      var self = this;
      var file = e.target.files[0];
      if (!file) return;
      this._print('carregando: ' + file.name);

      var reader = new FileReader();
      reader.onload = function (ev) {
        var img = new Image();
        img.onload = function () {
          var W = 240, H = 320;
          var ctxO = self._origCanvas.getContext('2d');
          ctxO.drawImage(img, 0, 0, W, H);
          self._print('imagem: ' + img.width + 'x' + img.height);
          self._print('estimando ângulo (passo: 2°, faixa: ±30°)...');

          var imageData = ctxO.getImageData(0, 0, W, H);
          var angle = utils.estimateRotationAngle(imageData, { step: 2, range: 30 });
          self._print('ângulo estimado: ' + angle + '°');

          var ctxF = self._fixedCanvas.getContext('2d');
          ctxF.clearRect(0, 0, W, H);
          ctxF.save();
          ctxF.translate(W / 2, H / 2);
          ctxF.rotate(-angle * Math.PI / 180);
          ctxF.translate(-W / 2, -H / 2);
          ctxF.drawImage(img, 0, 0, W, H);
          ctxF.restore();

          self._print('correção aplicada: ' + (-angle) + '° ✓');
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  return { demo: demo, utils: utils };
}));
