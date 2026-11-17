// макет размещения: рамки растут по сообщениям игры, так же это делает страница LMS
(function () {
  var game = document.getElementById('game'), card = document.getElementById('card');
  function sizes() {
    document.getElementById('gsize').textContent = 'рамка игры: ' + Math.round(game.getBoundingClientRect().width) + ' × ' + Math.round(game.getBoundingClientRect().height) + ' px';
    document.getElementById('csize').textContent = 'карточка: ' + Math.round(card.getBoundingClientRect().width) + ' × ' + Math.round(card.getBoundingClientRect().height) + ' px';
  }
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin || !e.data) return;
    var h = Math.round(Number(e.data.height) || 0);
    if (e.data.type === 'skill-relay:height' && h) game.style.height = Math.max(420, h) + 'px';
    if (e.data.type === 'skill-relay:card-height' && h) card.style.height = h + 'px';
    sizes();
  });
  window.addEventListener('resize', sizes); sizes();
})();
