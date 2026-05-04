(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.FaceDemo = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MODELS = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights';

  return {
    title: 'detecção facial — óculos e máscaras',
    _stream: null,
    _raf: null,
    _modelsLoaded: false,
    _log: null,
    _container: null,

    mount: function (container) {
      var self = this;
      this._container = container;
      container.innerHTML = [
        '<div class="demo-layout">',
        '  <div class="demo-canvas-wrap" style="position:relative;min-height:300px">',
        '    <video id="face-video" autoplay muted playsinline',
        '      style="width:100%;max-height:340px;display:none;border-radius:4px;"></video>',
        '    <canvas id="face-overlay"',
        '      style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"></canvas>',
        '    <canvas id="face-img" width="400" height="300" style="display:none;max-width:100%;"></canvas>',
        '  </div>',
        '  <div class="demo-sidebar">',
        '    <div class="demo-terminal" id="face-log"></div>',
        '    <div class="demo-controls">',
        '      <button class="demo-btn" id="face-cam-btn">> ativar câmera</button>',
        '      <label class="demo-btn" for="face-upload">',
        '        > upload de imagem',
        '        <input type="file" id="face-upload" accept="image/*" hidden>',
        '      </label>',
        '    </div>',
        '    <p class="demo-note">robusto a óculos e máscaras ✓</p>',
        '  </div>',
        '</div>'
      ].join('');

      this._log = container.querySelector('#face-log');
      var faceapi = typeof window !== 'undefined' ? window.faceapi : null;

      if (!faceapi) {
        this._print('erro: face-api.js não carregado');
        return Promise.resolve();
      }

      this._print('carregando modelos...');
      this._print('TinyFaceDetector + FaceLandmark68Tiny');

      return Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS)
      ]).then(function () {
        self._modelsLoaded = true;
        self._print('modelos carregados ✓');
        self._print('');
        self._print('ative a câmera ou envie uma imagem');

        container.querySelector('#face-cam-btn').addEventListener('click', function () { self._startCamera(); });
        container.querySelector('#face-upload').addEventListener('change', function (e) { self._handleUpload(e); });
      }).catch(function (err) {
        self._print('erro ao carregar modelos: ' + err.message);
      });
    },

    unmount: function () {
      if (this._stream) { this._stream.getTracks().forEach(function (t) { t.stop(); }); this._stream = null; }
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
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

    _startCamera: function () {
      var self = this;
      if (!navigator.mediaDevices) { this._print('câmera indisponível neste contexto'); return; }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(function (stream) {
          self._stream = stream;
          var video = self._container.querySelector('#face-video');
          video.srcObject = stream;
          video.style.display = 'block';
          self._container.querySelector('#face-img').style.display = 'none';
          self._print('câmera ativa — detectando...');
          video.addEventListener('playing', function () { self._detectLoop(video); }, { once: true });
        })
        .catch(function (err) { self._print('câmera negada: ' + err.message); });
    },

    _detectLoop: function (video) {
      var self = this;
      var faceapi = window.faceapi;
      var overlay = this._container.querySelector('#face-overlay');
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;

      var detect = function () {
        if (!self._stream) return;
        faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
          .withFaceLandmarks(true)
          .then(function (results) {
            var ctx = overlay.getContext('2d');
            ctx.clearRect(0, 0, overlay.width, overlay.height);
            faceapi.draw.drawDetections(overlay, results);
            faceapi.draw.drawFaceLandmarks(overlay, results);
            if (results.length > 0) {
              self._print(results.length + ' rosto(s)  conf: ' + (results[0].detection.score * 100).toFixed(1) + '%');
            }
            self._raf = requestAnimationFrame(detect);
          });
      };
      detect();
    },

    _handleUpload: function (e) {
      var self = this;
      var file = e.target.files[0];
      if (!file) return;
      if (!this._modelsLoaded) { this._print('modelos ainda carregando...'); return; }
      this._print('processando: ' + file.name);

      if (this._stream) { this._stream.getTracks().forEach(function (t) { t.stop(); }); this._stream = null; }
      if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }

      var video = this._container.querySelector('#face-video');
      video.style.display = 'none';
      var imgCanvas = this._container.querySelector('#face-img');
      imgCanvas.style.display = 'block';
      var overlay = this._container.querySelector('#face-overlay');

      var reader = new FileReader();
      reader.onload = function (ev) {
        var img = new Image();
        img.onload = function () {
          imgCanvas.width = img.width;
          imgCanvas.height = img.height;
          imgCanvas.getContext('2d').drawImage(img, 0, 0);
          overlay.width = img.width;
          overlay.height = img.height;

          window.faceapi
            .detectAllFaces(imgCanvas, new window.faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }))
            .withFaceLandmarks(true)
            .then(function (results) {
              var ctx = overlay.getContext('2d');
              ctx.clearRect(0, 0, overlay.width, overlay.height);
              window.faceapi.draw.drawDetections(overlay, results);
              window.faceapi.draw.drawFaceLandmarks(overlay, results);
              self._print(results.length + ' rosto(s) detectado(s)');
              results.forEach(function (r, i) {
                self._print('  rosto ' + (i + 1) + ': conf=' + (r.detection.score * 100).toFixed(1) + '%');
              });
            });
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  };
}));
