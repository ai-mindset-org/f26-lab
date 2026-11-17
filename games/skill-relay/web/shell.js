// общая оболочка всех страниц: поверхность (веб или LMS) и одно меню
// стол и журнал одни на обе поверхности, меняется только вид: ?skin=lms или ?skin=web, выбор помнит браузер
(function () {
  var q = new URLSearchParams(location.search), root = document.documentElement, skin = q.get('skin');
  try {
    if (skin === 'lms' || skin === 'web') localStorage.setItem('relay.skin', skin);
    else skin = localStorage.getItem('relay.skin') || 'web';
  } catch (e) { skin = skin === 'lms' ? 'lms' : 'web'; }
  if (skin === 'lms') root.setAttribute('data-skin', 'lms');
  window.SKIN = skin;

  var ITEMS = [['./', 'стол', ''], ['show', 'как работает', 'show'], ['try', 'попробовать', 'try'], ['rules', 'правила', 'rules'], ['./?view=log', 'журнал', 'log'], ['about', 'о системе', 'about']];
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function build() {
    var nav = document.querySelector('.tabs'); if (!nav) return;
    var here = location.pathname.replace(/\/+$/, '').split('/').pop(), log = q.get('view') === 'log';
    var page = here === 'show' || here === 'try' || here === 'rules' || here === 'about' ? here : log ? 'log' : '';
    nav.textContent = '';
    ITEMS.forEach(function (it, i) {
      var a = el('a', it[2] === page ? 'on' : ''); a.href = it[0];
      a.appendChild(el('i', '', (i < 9 ? '0' : '') + (i + 1))); a.appendChild(document.createTextNode(it[1]));
      nav.appendChild(a);
    });
    if (document.querySelector('.surf')) return;
    var sw = el('span', 'surf'); sw.title = 'один стол и один журнал, два вида: веб-версия и версия для LMS';
    [['web', 'веб'], ['lms', 'LMS']].forEach(function (s) {
      var a = el('a', s[0] === skin ? 'on' : '', s[1]); a.href = location.pathname + '?skin=' + s[0] + (log ? '&view=log' : ''); sw.appendChild(a);
    });
    nav.parentNode.insertBefore(sw, nav.nextSibling);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
