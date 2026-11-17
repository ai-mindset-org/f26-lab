// общая оболочка всех страниц: одно меню и вид по адресу
// веб-платформа живёт в корне: широкий экран, стадион, своя шапка
// версия для LMS живёт под /lms/: одна колонка под рамку на странице лабы, без стадиона и шапки
// стол и журнал у обеих версий одни, переключателя между ними нет
(function () {
  var q = new URLSearchParams(location.search), root = document.documentElement;
  var lms = /^\/lms(\/|$)/.test(location.pathname);
  if (lms) root.setAttribute('data-skin', 'lms');
  window.SKIN = lms ? 'lms' : 'web';
  // переключателей вида и темы нет: вид задаёт адрес, тема одна, светлая
  try { localStorage.removeItem('relay.skin'); localStorage.removeItem('relay.theme'); } catch (e) {}

  var ITEMS = [['./', lms ? 'skills' : 'стол', ''], ['show', 'как работает', 'show'], ['try', 'попробовать', 'try'], ['rules', 'правила', 'rules'], ['./?view=log', 'журнал', 'log']];
  if (!lms) ITEMS.push(['about', 'о системе', 'about']);
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function build() {
    var nav = document.querySelector('.tabs');
    if (nav) {
      var here = location.pathname.replace(/\/+$/, '').split('/').pop(), log = q.get('view') === 'log';
      var page = here === 'show' || here === 'try' || here === 'rules' || here === 'about' ? here : log ? 'log' : '';
      nav.textContent = '';
      ITEMS.forEach(function (it, i) {
        var a = el('a', it[2] === page ? 'on' : ''); a.href = it[0];
        if (!lms) a.appendChild(el('i', '', '0' + (i + 1)));
        a.appendChild(document.createTextNode(it[1]));
        nav.appendChild(a);
      });
    }
    if (lms) frame();
  }
  // рамка в LMS растёт по содержимому: страница лабы слушает это сообщение и ставит высоту
  function frame() {
    if (window.parent === window) return;
    var last = 0;
    function post() {
      var h = Math.ceil(document.body.getBoundingClientRect().height) + 2;
      if (Math.abs(h - last) < 2) return;
      last = h;
      window.parent.postMessage({ type: 'skill-relay:height', height: h }, '*');
    }
    if (window.ResizeObserver) new ResizeObserver(post).observe(document.body);
    window.addEventListener('load', post);
    setInterval(post, 1500);
    post();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
