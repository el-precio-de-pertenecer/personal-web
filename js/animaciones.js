/* Animaciones de la web.
   1) Las imágenes aparecen suavemente al entrar en pantalla.
   2) Los desplegables de «Sobre mí» se abren y cierran con una transición de altura.
   Todo es opcional: con movimiento reducido o si algo falla, la web funciona igual, sin animar. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  /* ---------- 1) Aparición de imágenes al hacer scroll ----------
     Debe coincidir con la lista de selectores del bloque «Animaciones» de css/style.css. */
  var REVEAL = '.portfolio-project, .about-fixed img, .case-gallery > img, .case-gallery > video, .synced-gif-gallery > img';

  function initReveal() {
    if (!root.classList.contains('anim') || !('IntersectionObserver' in window)) return;

    var targets = document.querySelectorAll(REVEAL);
    if (!targets.length) return;

    // Espera (como mucho ~1 s) a que la imagen esté descargada, para que no aparezca el hueco en blanco.
    function whenReady(el, done) {
      var img = el.tagName === 'IMG' ? el : el.querySelector('img');
      if (!img || img.complete) return done();
      var finished = false;
      function finish() { if (!finished) { finished = true; done(); } }
      img.addEventListener('load', finish, { once: true });
      img.addEventListener('error', finish, { once: true });
      setTimeout(finish, 1000);
    }

    var observer = new IntersectionObserver(function (entries) {
      // Si entran varias a la vez (carga de la página), aparecen en cascada de arriba abajo.
      var visible = entries.filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
      visible.forEach(function (entry, i) {
        var el = entry.target;
        observer.unobserve(el);
        whenReady(el, function () {
          el.style.transitionDelay = Math.min(i, 4) * 110 + 'ms';
          el.classList.add('is-in');
        });
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });

    targets.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- 2) Desplegables suaves (<details class="cv-accordion">) ---------- */
  function initAccordions() {
    var list = document.querySelectorAll('.cv-accordion');
    if (!list.length || !('animate' in Element.prototype)) return;

    var DURATION = 420;
    var EASING = 'cubic-bezier(.2, .65, .2, 1)';

    list.forEach(function (details) {
      var summary = details.querySelector('summary');
      var content = details.querySelector('.accordion-content');
      if (!summary || !content) return;
      var running = null;

      function toggle(openNext) {
        var from = details.getBoundingClientRect().height;   // altura de partida (también si se interrumpe a medias)
        if (running) { running.cancel(); running = null; }

        // Mide la altura abierta y la cerrada para animar entre ambas.
        details.open = true;
        var openHeight = details.getBoundingClientRect().height;
        details.open = false;
        var closedHeight = details.getBoundingClientRect().height;
        details.open = true;                                   // el contenido debe existir mientras se anima

        details.classList.toggle('is-closing', !openNext);
        details.style.overflow = 'hidden';

        var anim = details.animate(
          { height: [from + 'px', (openNext ? openHeight : closedHeight) + 'px'] },
          { duration: DURATION, easing: EASING, fill: 'forwards' }
        );
        running = anim;
        if (openNext) content.animate({ opacity: [0, 1] }, { duration: DURATION, easing: 'ease-out' });

        anim.onfinish = function () {
          if (running !== anim) return;
          running = null;
          details.open = openNext;
          details.classList.remove('is-closing');
          details.style.overflow = '';
          anim.cancel();
        };
      }

      summary.addEventListener('click', function (event) {
        event.preventDefault();                                // sustituye el abrir/cerrar instantáneo
        var isOpen = details.open && !details.classList.contains('is-closing');
        toggle(!isOpen);
      });
    });
  }

  try { initReveal(); } catch (e) { root.classList.remove('anim'); }
  try { initAccordions(); } catch (e) { /* si falla, los desplegables funcionan sin animación */ }
})();
