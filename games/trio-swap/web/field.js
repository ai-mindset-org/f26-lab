// Dot field of the attention practices: the 24px grid of the link preview on the apps canvas, every dot a little
// lighter or darker along a slow value-noise field, new on each visit. Drawn once per size and theme; the CSS dot
// grid of the host stays underneath as the fallback. Host: the element with data-field.
(function () {
  var host = document.querySelector('[data-field]'); if (!host) return;
  var cv = document.createElement('canvas'), ctx = cv.getContext('2d'); if (!ctx) return;
  cv.className = 'field'; cv.setAttribute('aria-hidden', 'true'); host.prepend(cv); host.classList.add('field-on');
  var seed = Math.random() * 1000, STEP = 24;
  function hash(x, y) { var s = Math.sin(x * 127.1 + y * 311.7 + seed) * 43758.5453; return s - Math.floor(s); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function noise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), u = smooth(x - xi), v = smooth(y - yi);
    var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function draw() {
    var dpr = Math.min(2, window.devicePixelRatio || 1), w = window.innerWidth, h = window.innerHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = getComputedStyle(host).getPropertyValue('--ink').trim() || '#111111';
    for (var y = STEP / 2; y < h; y += STEP) for (var x = STEP / 2; x < w; x += STEP) {
      var n = .65 * noise(x / 260, y / 260) + .35 * noise(x / 90 + 7, y / 90 + 3);
      ctx.globalAlpha = .025 + n * n * .13;
      ctx.beginPath(); ctx.arc(x, y, .7 + n * .75, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  var timer; function later() { clearTimeout(timer); timer = setTimeout(draw, 120); }
  addEventListener('resize', later);
  new MutationObserver(later).observe(document.documentElement, { attributes: true, attributeFilter: ['data-aim-profile', 'data-theme'] });
  draw();
})();
