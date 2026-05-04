(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    var m = factory();
    root.OmrDemo = m.demo;
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var utils = {
    /**
     * Detect marked cells in a bubble-grid from raw ImageData.
     * Returns array of { row, col, fill } for cells above threshold.
     */
    detectMarkedCells: function (imageData, config) {
      var w = imageData.width, h = imageData.height, data = imageData.data;
      var rows = config.rows, cols = config.cols;
      var sx = config.startX, sy = config.startY;
      var cw = config.cellW, ch = config.cellH;
      var threshold = config.threshold !== undefined ? config.threshold : 0.3;
      var marks = [];

      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var x0 = Math.round(sx + c * cw);
          var y0 = Math.round(sy + r * ch);
          var dark = 0, total = 0;

          for (var y = y0; y < Math.min(y0 + ch, h); y++) {
            for (var x = x0; x < Math.min(x0 + cw, w); x++) {
              var i = (y * w + x) * 4;
              var gray = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
              if (gray < 128) dark++;
              total++;
            }
          }

          if (total > 0 && dark / total > threshold) {
            marks.push({ row: r, col: c, fill: dark / total });
          }
        }
      }
      return marks;
    },

    /**
     * Build answer map from detected marks.
     * For each row (question), keeps the mark with the highest fill ratio.
     * Returns { rowIndex: { col, fill } }.
     */
    buildAnswerMap: function (marks) {
      var answers = {};
      marks.forEach(function (m) {
        if (!answers[m.row] || answers[m.row].fill < m.fill) {
          answers[m.row] = { col: m.col, fill: m.fill };
        }
      });
      return answers;
    },

    OPTION_LABELS: ['A', 'B', 'C', 'D', 'E']
  };

  var demo = {
    title: 'omr — corretor de gabaritos',

    mount: function (container) {
      var self = this;
      container.innerHTML = [
        '<div class="demo-layout">',
        '  <div class="demo-canvas-wrap">',
        '    <canvas id="omr-canvas" width="380" height="480"></canvas>',
        '  </div>',
        '  <div class="demo-sidebar">',
        '    <div class="demo-terminal" id="omr-log"></div>',
        '    <div class="demo-controls">',
        '      <button class="demo-btn" id="omr-sample-btn">> carregar gabarito de amostra</button>',
        '      <label class="demo-btn" for="omr-upload">',
        '        > upload de gabarito',
        '        <input type="file" id="omr-upload" accept="image/*" hidden>',
        '      </label>',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('');

      this._log = container.querySelector('#omr-log');
      this._canvas = container.querySelector('#omr-canvas');
      this._ctx = this._canvas.getContext('2d');

      container.querySelector('#omr-sample-btn').addEventListener('click', function () { self._loadSample(); });
      container.querySelector('#omr-upload').addEventListener('change', function (e) { self._handleUpload(e); });

      this._print('OMR — Optical Mark Recognition');
      this._print('algoritmo: análise de densidade de pixels');
      this._print('');
      this._print('carregue um gabarito para iniciar');
      return Promise.resolve();
    },

    unmount: function () {
      this._ctx = null;
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

    _loadSample: function () {
      var self = this;
      var ctx = this._ctx;
      var canvas = this._canvas;
      var W = canvas.width, H = canvas.height;

      ctx.fillStyle = '#f5f5f0';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, W, 50);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GABARITO — 20 QUESTÕES', W / 2, 30);
      ctx.textAlign = 'left';

      var sx = 50, sy = 70, cw = 30, ch = 26;
      var answers = [0, 2, 1, 4, 3, 0, 1, 2, 3, 4, 2, 0, 3, 1, 4, 0, 2, 3, 1, 4];
      var labels = ['A', 'B', 'C', 'D', 'E'];

      ctx.fillStyle = '#444';
      ctx.font = '11px monospace';
      labels.forEach(function (l, i) { ctx.fillText(l, sx + i * cw + 10, sy - 8); });

      for (var r = 0; r < 20; r++) {
        ctx.fillStyle = '#555';
        ctx.font = '10px monospace';
        ctx.fillText((r + 1) + '.', sx - 38, sy + r * ch + 15);

        for (var c = 0; c < 5; c++) {
          var cx = sx + c * cw + 7, cy = sy + r * ch + 3;
          ctx.strokeStyle = '#888';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(cx + 7, cy + 9, 8, 0, Math.PI * 2);
          ctx.stroke();

          if (answers[r] === c) {
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath();
            ctx.arc(cx + 7, cy + 9, 7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      this._print('gabarito de amostra carregado');
      this._print('analisando marcações...');

      var self = this;
      setTimeout(function () {
        var imageData = ctx.getImageData(0, 0, W, H);
        var config = { rows: 20, cols: 5, startX: sx + 2, startY: sy + 2, cellW: cw, cellH: ch, threshold: 0.25 };
        var marks = utils.detectMarkedCells(imageData, config);
        var answerMap = utils.buildAnswerMap(marks);
        var keys = Object.keys(answerMap);

        self._print(marks.length + ' marcações detectadas em ' + keys.length + ' questões');
        self._print('');

        keys.slice(0, 10).forEach(function (q) {
          var a = answerMap[q];
          self._print('Q' + (parseInt(q) + 1) + ': ' + utils.OPTION_LABELS[a.col] + '  (' + (a.fill * 100).toFixed(0) + '%)');
          var hx = sx + a.col * cw + 7;
          var hy = sy + parseInt(q) * ch + 3;
          ctx.strokeStyle = '#57ab5a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(hx + 7, hy + 9, 10, 0, Math.PI * 2);
          ctx.stroke();
        });

        if (keys.length > 10) self._print('... e mais ' + (keys.length - 10) + ' questões');
        self._print('');
        self._print('detecção concluída ✓');
      }, 400);
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
          var ctx = self._ctx;
          ctx.clearRect(0, 0, self._canvas.width, self._canvas.height);
          ctx.drawImage(img, 0, 0, self._canvas.width, self._canvas.height);
          self._print('imagem: ' + img.width + 'x' + img.height);
          self._print('use o gabarito de amostra para ver a detecção automática');
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  return { demo: demo, utils: utils };
}));
