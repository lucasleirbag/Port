(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    var m = factory();
    root.OcrDemo = m.demo;
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var utils = {
    /**
     * Build HTML string with confidence-colored spans from Tesseract word array.
     */
    buildHighlightedHtml: function (words) {
      if (!Array.isArray(words)) return '';
      return words.map(function (word) {
        var conf = word.confidence || 0;
        var cls = conf >= 80 ? 'conf-high' : conf >= 50 ? 'conf-mid' : 'conf-low';
        var text = (word.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return '<span class="ocr-word ' + cls + '" title="conf: ' + conf.toFixed(0) + '%">' + text + '</span>';
      }).join(' ');
    },

    /**
     * Normalize OCR text: collapse whitespace, trim.
     */
    cleanText: function (text) {
      if (!text) return '';
      return text.replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    },

    /**
     * Calculate average confidence from Tesseract word array.
     */
    averageConfidence: function (words) {
      if (!words || words.length === 0) return 0;
      return words.reduce(function (acc, w) { return acc + (w.confidence || 0); }, 0) / words.length;
    }
  };

  var demo = {
    title: 'ocr — extração de texto em documentos',
    _worker: null,

    mount: function (container) {
      var self = this;
      container.innerHTML = [
        '<div class="demo-layout ocr-layout">',
        '  <div class="demo-canvas-wrap">',
        '    <canvas id="ocr-canvas" width="400" height="300"></canvas>',
        '    <div class="ocr-result" id="ocr-result"></div>',
        '  </div>',
        '  <div class="demo-sidebar">',
        '    <div class="demo-terminal" id="ocr-log"></div>',
        '    <div class="demo-progress" id="ocr-progress" style="display:none">',
        '      <div class="demo-progress-bar" id="ocr-bar"></div>',
        '    </div>',
        '    <div class="demo-controls">',
        '      <label class="demo-btn" for="ocr-upload">',
        '        > selecionar documento',
        '        <input type="file" id="ocr-upload" accept="image/*" hidden>',
        '      </label>',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('');

      this._log = container.querySelector('#ocr-log');
      this._canvas = container.querySelector('#ocr-canvas');
      this._result = container.querySelector('#ocr-result');

      this._print('Tesseract.js OCR — modelos próprios');
      this._print('idiomas: por + eng');
      this._print('');
      this._print('selecione uma imagem de documento');

      container.querySelector('#ocr-upload').addEventListener('change', function (e) {
        self._handleUpload(e, container);
      });
      return Promise.resolve();
    },

    unmount: function () {
      if (this._worker) {
        return Promise.resolve()
          .then(function () { return this._worker.terminate(); }.bind(this))
          .catch(function () {});
      }
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

    _handleUpload: function (e, container) {
      var self = this;
      var file = e.target.files[0];
      if (!file) return;
      var Tesseract = typeof window !== 'undefined' ? window.Tesseract : null;
      if (!Tesseract) { this._print('erro: Tesseract.js não encontrado'); return; }

      this._print('carregando: ' + file.name);
      var reader = new FileReader();
      reader.onload = function (ev) {
        var img = new Image();
        img.onload = function () {
          self._canvas.width = Math.min(img.width, 400);
          self._canvas.height = Math.min(img.height, 300);
          self._canvas.getContext('2d').drawImage(img, 0, 0, self._canvas.width, self._canvas.height);
          self._print('imagem: ' + img.width + 'x' + img.height);
          self._runOcr(ev.target.result, container);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    },

    _runOcr: function (src, container) {
      var self = this;
      var Tesseract = window.Tesseract;
      var progressEl = container.querySelector('#ocr-progress');
      var bar = container.querySelector('#ocr-bar');

      progressEl.style.display = 'block';
      this._print('reconhecendo texto...');

      Tesseract.recognize(src, 'por+eng', {
        logger: function (m) {
          if (m.status === 'recognizing text' && bar) {
            bar.style.width = (m.progress * 100).toFixed(0) + '%';
          }
        }
      }).then(function (result) {
        progressEl.style.display = 'none';
        var words = result.data.words || [];
        var avg = utils.averageConfidence(words);
        self._print(words.length + ' palavras extraídas');
        self._print('confiança média: ' + avg.toFixed(1) + '%');
        self._result.innerHTML = utils.buildHighlightedHtml(words);
        self._result.style.display = 'block';
        self._print('concluído ✓');
      }).catch(function (err) {
        progressEl.style.display = 'none';
        self._print('erro: ' + err.message);
      });
    }
  };

  return { demo: demo, utils: utils };
}));
