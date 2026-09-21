/* Согласие на cookie и загрузка Яндекс Метрики только после согласия */
(function(){
  var ID = 109259703, KEY = 'ys-cookie';
  var base = (document.currentScript && document.currentScript.src || '').replace(/assets\/consent\.js.*$/, '');
  function get(){ try { return localStorage.getItem(KEY); } catch(e) { return null; } }
  function set(v){ try { localStorage.setItem(KEY, v); } catch(e) {} }
  function loadMetrika(){
    if (window.ym) return;
    (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
    (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
    window.ym(ID, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true});
  }
  function banner(){
    var css = document.createElement('style');
    css.textContent = '.ck{position:fixed;z-index:9000;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));max-width:620px;margin-inline:auto;background:#F7FAF8;color:#2F3B38;border-radius:22px;box-shadow:0 0 0 1px rgba(47,59,56,.14),0 24px 60px -24px rgba(47,59,56,.45);padding:18px 20px;font:400 .92rem/1.5 Manrope,system-ui,sans-serif;display:grid;gap:12px}'
      + '.ck a{color:#4C7867}.ck-row{display:flex;flex-wrap:wrap;gap:10px}'
      + '.ck button{font:500 .9rem Manrope,system-ui,sans-serif;min-height:40px;padding:0 18px;border-radius:999px;border:0;cursor:pointer}'
      + '.ck .y{background:#4C7867;color:#F7FAF8}.ck .n{background:#E3EDE7;color:#2F3B38}';
    document.head.appendChild(css);
    var el = document.createElement('div');
    el.className = 'ck'; el.setAttribute('role','dialog'); el.setAttribute('aria-label','Файлы cookie');
    el.innerHTML = '<p>Сайт использует файлы cookie и сервис Яндекс Метрика, чтобы понимать, как им пользуются. Нажимая «Принять», вы соглашаетесь на такую обработку данных. Подробнее — в <a href="' + base + 'politika.html">Политике обработки персональных данных</a>.</p>'
      + '<div class="ck-row"><button class="y" type="button">Принять</button><button class="n" type="button">Отклонить</button></div>';
    document.body.appendChild(el);
    el.querySelector('.y').onclick = function(){ set('all'); el.remove(); loadMetrika(); };
    el.querySelector('.n').onclick = function(){ set('necessary'); el.remove(); };
  }
  var v = get();
  if (v === 'all') loadMetrika();
  else if (v !== 'necessary') { if (document.body) banner(); else document.addEventListener('DOMContentLoaded', banner); }
  /* ссылка «Настройки cookie» в подвале снова показывает выбор */
  document.addEventListener('click', function(e){
    var a = e.target.closest ? e.target.closest('[data-cookie-settings]') : null;
    if (!a) return; e.preventDefault(); set(''); if (!document.querySelector('.ck')) banner();
  });
})();
