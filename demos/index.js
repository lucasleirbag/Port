(function () {
  'use strict';

  window.addEventListener('DOMContentLoaded', function () {
    var engine = new window.DemoEngine();
    window._demoEngine = engine;

    engine.register('face-detection', window.FaceDemo);
    engine.register('ocr', window.OcrDemo);
    engine.register('omr', window.OmrDemo);
    engine.register('docorient', window.DocOrientDemo);
    engine.register('plates', window.PlatesDemo);

    document.querySelectorAll('[data-demo-open]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        engine.open(btn.dataset.demoOpen);
      });
    });
  });
}());
