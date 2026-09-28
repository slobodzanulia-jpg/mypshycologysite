/* Запись на консультацию: календарь, слоты, лист ожидания.
   Расписание берётся из assets/raspisanie.js */
(function () {
  var R = window.RASPISANIE;
  var root = document.getElementById('bk');
  if (!R || !root) return;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function goal(g) { if (typeof window.ym === 'function') window.ym(109259703, 'reachGoal', g); }

  var MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  var MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var DAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  var KEYS = ['vs', 'pn', 'vt', 'sr', 'cht', 'pt', 'sb'];
  var USLUGI = {
    znak: 'Встреча-знакомство, 20 минут, без оплаты',
    ind: 'Индивидуальная консультация, 60 минут, 4 000 ₽',
    sem: 'Семейная консультация, 80 минут, 6 000 ₽',
    biz: 'Для бизнеса и HR, 120 минут, 20 000 ₽'
  };

  /* время по Москве, независимо от часового пояса посетителя */
  function mskNow() { var d = new Date(); return new Date(d.getTime() + d.getTimezoneOffset() * 60000 + 3 * 3600000); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function human(d) { return DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS_GEN[d.getMonth()]; }

  var now = mskNow();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var last = new Date(today); last.setDate(last.getDate() + (R.dneyVpered || 60));
  var off = R.neRabotayu || [];

  function slotsFor(d) {
    var key = ymd(d);
    if (d < today || d > last || off.indexOf(key) > -1) return [];
    var base = ((R.nedelya || {})[KEYS[d.getDay()]] || []).concat((R.dopOkna || {})[key] || []);
    base = base.filter(function (t, i) { return base.indexOf(t) === i; }).sort();
    var busy = (R.zanyato || {})[key] || [];
    var limit = new Date(now.getTime() + (R.minChasovDo || 0) * 3600000);
    return base.map(function (t) {
      var p = t.split(':'), at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), +p[0], +p[1] || 0);
      return { t: t, busy: busy === 'весь' || (busy.indexOf && busy.indexOf(t) > -1), past: at <= limit };
    }).filter(function (s) { return !s.past; });
  }
  function dayState(d) {
    var s = slotsFor(d);
    if (!s.length) return 'off';
    return s.some(function (x) { return !x.busy; }) ? 'free' : 'full';
  }

  /* ---------- календарь ---------- */
  var grid = $('#bkGrid'), monthEl = $('#bkMonth'), prev = $('#bkPrev'), next = $('#bkNext');
  var slotsEl = $('#bkSlots'), dayTitle = $('#bkDayTitle');
  var view = new Date(today.getFullYear(), today.getMonth(), 1);
  var selDay = null, sel = null; /* sel = {d, t, mode: free|wait|nodate} */

  function firstAvailable() {
    for (var d = new Date(today); d <= last; d.setDate(d.getDate() + 1)) if (dayState(d) === 'free') return new Date(d);
    return null;
  }

  function renderMonth() {
    monthEl.textContent = MONTHS[view.getMonth()] + ' ' + view.getFullYear();
    prev.disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
    next.disabled = new Date(view.getFullYear(), view.getMonth() + 1, 1) > last;
    grid.innerHTML = '';
    var lead = (view.getDay() + 6) % 7;
    for (var i = 0; i < lead; i++) grid.appendChild(document.createElement('span'));
    var days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (var n = 1; n <= days; n++) {
      var d = new Date(view.getFullYear(), view.getMonth(), n), st = dayState(d);
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'bk-day is-' + st; b.textContent = n;
      b.dataset.date = ymd(d);
      if (+d === +today) b.classList.add('is-today');
      if (st === 'off') { b.disabled = true; b.setAttribute('aria-label', n + ' ' + MONTHS_GEN[d.getMonth()] + ', записи нет'); }
      else b.setAttribute('aria-label', n + ' ' + MONTHS_GEN[d.getMonth()] + (st === 'free' ? ', есть свободные окна' : ', всё занято, можно встать в лист ожидания'));
      if (selDay && +selDay === +d) { b.classList.add('is-sel'); b.setAttribute('aria-pressed', 'true'); }
      grid.appendChild(b);
    }
  }
  grid.addEventListener('click', function (e) {
    var b = e.target.closest('.bk-day'); if (!b || b.disabled) return;
    var p = b.dataset.date.split('-'); selDay = new Date(+p[0], +p[1] - 1, +p[2]);
    renderMonth(); renderSlots();
  });
  prev.addEventListener('click', function () { view.setMonth(view.getMonth() - 1); renderMonth(); });
  next.addEventListener('click', function () { view.setMonth(view.getMonth() + 1); renderMonth(); });

  function renderSlots() {
    slotsEl.innerHTML = '';
    if (!selDay) { dayTitle.textContent = 'Выберите дату в календаре'; return; }
    var s = slotsFor(selDay);
    dayTitle.textContent = human(selDay).charAt(0).toUpperCase() + human(selDay).slice(1);
    s.forEach(function (x) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'bk-slot' + (x.busy ? ' is-busy' : '');
      b.dataset.t = x.t; b.dataset.busy = x.busy ? '1' : '';
      b.innerHTML = '<b>' + x.t + '</b>' + (x.busy ? '<small>занято</small>' : '');
      b.setAttribute('aria-label', x.t + (x.busy ? ', занято, можно попросить перезвонить' : ', свободно'));
      if (sel && sel.d && +sel.d === +selDay && sel.t === x.t) { b.classList.add('is-sel'); b.setAttribute('aria-pressed', 'true'); }
      slotsEl.appendChild(b);
    });
  }
  slotsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.bk-slot'); if (!b) return;
    sel = { d: selDay, t: b.dataset.t, mode: b.dataset.busy ? 'wait' : 'free' };
    goal(sel.mode === 'wait' ? 'booking_wait' : 'booking_slot');
    renderSlots(); openForm();
  });
  $('#bkNone').addEventListener('click', function () {
    sel = { mode: 'nodate' }; renderSlots(); openForm(); goal('booking_nodate');
  });

  /* ---------- форма ---------- */
  var form = $('#bkForm'), chosen = $('#bkChosen'), err = $('#bkErr'), done = $('#bkDone');
  var comment = $('#bkComment'), commentLbl = $('#bkCommentLbl');
  var K = R.kontakty || {};
  if (K.formEndpoint) form.classList.add('has-endpoint');

  function setChosen() {
    if (!sel) {
      chosen.innerHTML = 'Время пока не выбрано. Выберите окно в календаре выше или просто отправьте запрос — я предложу варианты.';
      commentLbl.textContent = 'Своими словами (необязательно)'; comment.required = false; render(); return;
    }
    if (sel.mode === 'free') {
      chosen.innerHTML = 'Вы выбрали <b>' + human(sel.d) + ', ' + sel.t + '</b> (по Москве). Оставьте контакты — я подтвержу запись.';
      commentLbl.textContent = 'Своими словами (необязательно)'; comment.required = false;
    } else if (sel.mode === 'wait') {
      chosen.innerHTML = 'Время <b>' + human(sel.d) + ', ' + sel.t + '</b> сейчас занято. Оставьте заявку: я перезвоню, если оно освободится, или предложу ближайшее свободное окно.';
      commentLbl.textContent = 'Какое ещё время вам подходит? (необязательно)'; comment.required = false;
    } else {
      chosen.innerHTML = 'Напишите, в какие дни и часы вам удобно, — я подберу время и свяжусь с вами.';
      commentLbl.textContent = 'Когда вам удобно'; comment.required = true;
    }
    render();
  }
  function openForm() {
    done.hidden = true; form.hidden = false; err.textContent = '';
    setChosen();
    var y = form.getBoundingClientRect().top + window.pageYOffset - 90;
    window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    if (sel && sel.mode === 'nodate') setTimeout(function () { comment.focus({ preventScroll: true }); }, reduced ? 0 : 450);
  }

  /* что беспокоит */
  var chipsBox = $('#bkChips');
  if (chipsBox) chipsBox.addEventListener('click', function (e) {
    var c = e.target.closest('.bk-chip'); if (!c) return;
    c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    render();
  });
  function topics() {
    return $$('.bk-chip[aria-pressed="true"]', form).map(function (c) { return c.textContent; });
  }

  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function checked(name) { var el = $('input[name="' + name + '"]:checked', form); return el ? el.value : ''; }

  function build() {
    var t = 'Здравствуйте, Юлия! ';
    if (!sel) t += 'Хочу записаться на консультацию. Время обсудим.';
    else if (sel.mode === 'free') t += 'Хочу записаться.\nДата и время: ' + human(sel.d) + ', ' + sel.t + ' (МСК)';
    else if (sel.mode === 'wait') t += 'Хочу записаться на время, которое сейчас занято: ' + human(sel.d) + ', ' + sel.t + ' (МСК).\nЕсли оно освободится или есть близкое окно — перезвоните мне, пожалуйста.';
    else t += 'Хочу записаться, но не нашёл(ла) подходящего времени в календаре.';
    var tp = topics(), unsure = tp.indexOf('Пока не могу сформулировать') > -1;
    tp = tp.filter(function (x) { return x !== 'Пока не могу сформулировать'; });
    if (tp.length) t += '\nМеня беспокоит: ' + tp.map(function (x) { return x.charAt(0).toLowerCase() + x.slice(1); }).join(', ') + '.';
    if (unsure) t += '\nПока сложно сформулировать запрос — хочу разобраться вместе.';
    t += '\nВстреча: ' + (USLUGI[checked('usluga')] || '');
    t += '\nФормат: ' + checked('format');
    var c = val('bkComment');
    if (c) t += '\n' + (sel && sel.mode === 'nodate' ? 'Удобное время: ' : '') + c;
    if (val('bkName')) t += '\nИмя: ' + val('bkName');
    if (val('bkPhone')) t += '\nТелефон: ' + val('bkPhone');
    t += '\nУдобно связаться: ' + val('bkVia');
    return t;
  }

  var msgEl = $('#bkMsg');
  function render() { if (msgEl) msgEl.textContent = build(); }
  form.addEventListener('input', render);
  form.addEventListener('change', render);

  function validate() {
    var bad = null;
    if (val('bkName').length < 2) bad = ['bkName', 'Укажите, как к вам обращаться.'];
    else if (val('bkPhone').replace(/\D/g, '').length < 10) bad = ['bkPhone', 'Проверьте номер телефона: нужно не меньше 10 цифр.'];
    else if (sel && sel.mode === 'nodate' && !val('bkComment')) bad = ['bkComment', 'Напишите, в какие дни и часы вам удобно.'];
    else if (!$('#bkConsent').checked) bad = ['bkConsent', 'Отметьте согласие на обработку персональных данных — без него я не смогу с вами связаться.'];
    $$('[aria-invalid]', form).forEach(function (el) { el.removeAttribute('aria-invalid'); });
    if (bad) { var el = document.getElementById(bad[0]); el.setAttribute('aria-invalid', 'true'); el.focus(); err.textContent = bad[1]; return false; }
    err.textContent = ''; return true;
  }

  function copy(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).catch(function () {});
    var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove();
    return Promise.resolve();
  }

  function showDone(t, via) {
    form.hidden = true; done.hidden = false;
    $('#bkDoneMsg').textContent = t;
    var head = $('#bkDoneHead'), txt = $('#bkDoneTxt');
    if (via === 'form') { head.textContent = 'Заявка отправлена'; txt.textContent = 'Я получила вашу заявку и свяжусь с вами в течение дня, чтобы подтвердить время.'; }
    else { head.textContent = 'Заявка готова'; txt.textContent = 'Проверьте, что сообщение ушло в ' + (via === 'wa' ? 'WhatsApp' : via === 'tg' ? 'Telegram' : 'почте') + '. Если мессенджер не открылся — скопируйте текст ниже и отправьте мне любым удобным способом. Я отвечу в течение дня и подтвержу время.'; }
    var y = done.getBoundingClientRect().top + window.pageYOffset - 90;
    window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var via = (e.submitter && e.submitter.dataset.via) || (K.formEndpoint ? 'form' : 'wa');
    if (!validate()) return;
    var t = build(), enc = encodeURIComponent(t);
    goal('booking_send_' + via);
    if (via === 'wa') { window.open('https://wa.me/' + K.whatsapp + '?text=' + enc, '_blank', 'noopener'); showDone(t, via); }
    else if (via === 'tg') { copy(t); window.open('https://t.me/' + K.telegram + '?text=' + enc, '_blank', 'noopener'); showDone(t, via); }
    else if (via === 'mail') { location.href = 'mailto:' + K.email + '?subject=' + encodeURIComponent('Запись на консультацию') + '&body=' + enc; showDone(t, via); }
    else if (via === 'form') {
      var btn = e.submitter; if (btn) btn.disabled = true;
      fetch(K.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ _subject: 'Запись на консультацию', message: t, name: val('bkName'), phone: val('bkPhone') }) })
        .then(function (r) { if (!r.ok) throw 0; showDone(t, 'form'); })
        .catch(function () { err.textContent = 'Заявка не отправилась. Попробуйте ещё раз или отправьте её в WhatsApp или Telegram.'; })
        .then(function () { if (btn) btn.disabled = false; });
    }
  });

  $('#bkCopy').addEventListener('click', function () {
    copy($('#bkDoneMsg').textContent).then(function () { $('#bkCopy').textContent = 'Скопировано'; setTimeout(function () { $('#bkCopy').textContent = 'Скопировать текст'; }, 2000); });
  });
  $('#bkAgain').addEventListener('click', function () {
    done.hidden = true; form.hidden = false; sel = null; renderSlots(); setChosen();
    $$('.bk-chip', form).forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
    root.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  });

  /* ссылки «Записаться» по всему сайту: выбрать услугу, закрыть открытые окна и прокрутить к записи */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href$="#zapis"]') : null; if (!a) return;
    $$('dialog[open]').forEach(function (d) { d.close(); });
    var u = a.dataset.usluga; if (u) { var r = $('input[name="usluga"][value="' + u + '"]', form); if (r) { r.checked = true; render(); } }
  });

  /* текст из конструктора запроса попадает в комментарий */
  window.bkPrefill = function (text) { comment.value = text; };

  /* старт: сразу открываем ближайший день со свободными окнами */
  selDay = firstAvailable();
  if (selDay) view = new Date(selDay.getFullYear(), selDay.getMonth(), 1);
  renderMonth(); renderSlots(); setChosen();

  /* ---------- занятость из Google Таблицы ---------- */
  function csvRows(text) {
    var rows = [], row = [], cur = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }
  function normDate(v) {
    v = (v || '').trim(); var m;
    if ((m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
    if ((m = v.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/))) { var y = +m[3]; if (y < 100) y += 2000; return y + '-' + pad(+m[2]) + '-' + pad(+m[1]); }
    return null;
  }
  function normTime(v) {
    v = (v || '').trim().toLowerCase();
    if (v.indexOf('весь') > -1) return 'весь';
    if (v.indexOf('не работ') > -1 || v.indexOf('выходн') > -1 || v.indexOf('отпуск') > -1 || v.indexOf('праздн') > -1) return 'off';
    if (v.indexOf('не свобод') > -1 || v.indexOf('занят') > -1 || v.indexOf('закрыт') > -1) return 'весь';
    var m = v.match(/(\d{1,2})[:.](\d{2})/); return m ? pad(+m[1]) + ':' + m[2] : null;
  }
  function sheetUrl(src) {
    if (!src) return null;
    if (src.indexOf('output=csv') > -1) return src + (src.indexOf('?') > -1 ? '&' : '?') + 't=' + Date.now();
    var m = src.match(/\/d\/([a-zA-Z0-9_-]{20,})/); var id = m ? m[1] : (/^[a-zA-Z0-9_-]{20,}$/.test(src) ? src : null);
    return id ? 'https://docs.google.com/spreadsheets/d/' + id + '/export?format=csv' : null;
  }
  function applySheet(text) {
    var z = {}; Object.keys(R.zanyato || {}).forEach(function (k) { var v = R.zanyato[k]; z[k] = v === 'весь' ? 'весь' : v.slice(); });
    csvRows(text).forEach(function (r) {
      var d = normDate(r[0]), t = normTime(r[1]); if (!d || !t) return;
      if (t === 'off') { if (off.indexOf(d) < 0) off.push(d); return; }
      if (t === 'весь' || z[d] === 'весь') { z[d] = 'весь'; return; }
      (z[d] = z[d] || []).push(t);
    });
    R.zanyato = z;
    if (selDay && dayState(selDay) === 'off') selDay = firstAvailable();
    if (sel && sel.mode === 'free' && sel.d) {
      var still = slotsFor(sel.d).filter(function (x) { return x.t === sel.t; })[0];
      if (still && still.busy) { sel.mode = 'wait'; if (!form.hidden) setChosen(); }
    }
    renderMonth(); renderSlots();
  }
  /* загрузка таблицы: JSONP (без ограничений CORS), запасной путь — CSV */
  function cellText(c) {
    if (!c) return '';
    if (c.f) return String(c.f);
    var v = c.v; if (v == null) return '';
    var m = String(v).match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+))?/);
    if (m) {
      if (+m[1] < 1900) return pad(+m[4] || 0) + ':' + pad(+m[5] || 0);
      return pad(+m[3]) + '.' + pad(+m[2] + 1) + '.' + m[1];
    }
    return String(v);
  }
  function toCsv(rows) {
    return rows.map(function (r) { return '"' + r[0].replace(/"/g, '""') + '","' + r[1].replace(/"/g, '""') + '"'; }).join('\n');
  }
  var status = function (ok, n) {
    var msg = ok ? 'Таблица подключена: строк с расписанием — ' + n + '.' : 'Таблица не загрузилась. Проверьте доступ: «Все, у кого есть ссылка» — «Читатель».';
    if (window.console) console.log('[запись] ' + msg);
    if (/proverka/.test(location.search)) {
      var p = document.createElement('p'); p.className = 'bk-status'; p.textContent = msg;
      p.style.cssText = 'margin:14px 0 0;padding:10px 14px;border-radius:12px;font-size:.85rem;background:' + (ok ? 'rgba(47,91,64,.14)' : 'rgba(179,38,30,.12)');
      $('.bk-cal').appendChild(p);
    }
  };
  function sheetId(src) {
    var m = (src || '').match(/\/d\/([a-zA-Z0-9_-]{20,})/);
    return m && m[1] !== 'e' ? m[1] : null;
  }
  function loadCsv(done) {
    var su = sheetUrl(R.tablica);
    if (!su || !window.fetch) return done(false);
    fetch(su, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw 0; return r.text(); })
      .then(function (t) { if (/<html/i.test(t)) throw 0; applySheet(t); done(true, csvRows(t).length - 1); })
      .catch(function () { done(false); });
  }
  (function () {
    if (!R.tablica) return;
    var id = sheetId(R.tablica), finished = false;
    root.classList.add('is-loading');
    function done(ok, n) { if (finished) return; finished = true; root.classList.remove('is-loading'); status(ok, n || 0); }
    loadCsv(function (ok, n) { if (ok) done(true, n); else jsonp(); });
    function jsonp() {
    if (!id) return done(false);
    var cb = 'bkSheet' + Date.now();
    window[cb] = function (res) {
      try {
        if (!res || res.status === 'error' || !res.table) throw 0;
        var rows = (res.table.rows || []).map(function (r) { return [cellText(r.c[0]), cellText(r.c[1])]; });
        var cols = res.table.cols || [];
        if (cols[0] && cols[0].label && normDate(cols[0].label)) rows.unshift([cols[0].label, (cols[1] && cols[1].label) || '']);
        applySheet(toCsv(rows)); done(true, rows.length);
      } catch (e) { done(false); }
      try { delete window[cb]; } catch (e) { window[cb] = undefined; }
    };
    var sc = document.createElement('script');
    sc.src = 'https://docs.google.com/spreadsheets/d/' + id + '/gviz/tq?tqx=out:json;responseHandler:' + cb + '&headers=1&t=' + Date.now();
    sc.onerror = function () { done(false); };
    document.head.appendChild(sc);
    setTimeout(function () { done(false); }, 8000);
    }
  })();
})();
