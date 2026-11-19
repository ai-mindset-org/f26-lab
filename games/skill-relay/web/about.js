// страница «о системе»: живые ответы сервера о том, кого он видит и какие пределы стоят на столе
(function () {
  function get(path) { return fetch(path, { credentials: 'same-origin' }).then(function (r) { return r.json(); }); }
  function el(tag, text) { var e = document.createElement(tag); if (text) e.textContent = text; return e; }
  function box(id, title, rows) {
    var b = document.getElementById(id); b.replaceChildren(el('h3', title));
    rows.forEach(function (r) { if (!r) return; var p = el('div'); if (r[0]) p.appendChild(el('b', r[0])); p.appendChild(document.createTextNode(r[1])); b.appendChild(p); });
  }
  function span(sec) { return sec >= 3600 ? Math.round(sec / 3600) + ' ч' : sec >= 120 ? Math.round(sec / 60) + ' мин' : sec + ' с'; }
  get('api/whoami').then(function (w) {
    box('me', 'кого видит сервер', [
      w.viewer ? ['на столе ты: ', w.shown || w.viewer] : ['', 'Ты не вошёл. Стол открыт на чтение, имена участников скрыты.'],
      w.viewer ? ['аккаунт: ', w.viewer] : null,
      w.viewer ? ['способ входа: ', w.auth || 'место в демо'] : null,
      w.seen ? ['Tailscale называет тебя: ', w.name + ' · ' + w.login] : null,
      ['режим стола: ', w.mode],
      ['включённые входы: ', (w.ways || []).join(' · ') || 'ссылка от ведущего'],
      ['', 'Это всё, что сервер знает о тебе: имя, аккаунт и способ входа. Они стоят у каждой твоей версии.']]);
    document.getElementById('git').textContent = w.git ? 'На этом столе каждая версия записана коммитом в репозиторий стола.' : 'Запуск с флагом --git записывает каждую версию коммитом в репозиторий стола.';
  }, function () { box('me', 'кого видит сервер', [['', 'Сервер не ответил: страница работает на сервере эстафеты.']]); });
  Promise.all([get('api/rules'), get('api/state')]).then(function (r) {
    var L = r[0].limits || {}, S = r[1] || {};
    box('limits', 'пределы одного изменения', [
      ['закрепление: ', span(S.lock || 300) + ' на одно изменение'],
      ['пауза после взятия: ', span(S.hour || 3600)],
      ['одно изменение: ', 'до ' + L.changed + ' строк'],
      ['skill целиком: ', 'до ' + L.lines + ' строк'],
      ['разборов на одно изменение: ', String(L.reviews)],
      ['правил в книге: ', String((r[0].rules || []).length)]]);
  }, function () { });
})();
