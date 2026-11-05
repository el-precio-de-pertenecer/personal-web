/* Animaciones de la web.
   1) Las imágenes aparecen suavemente al entrar en pantalla.
   2) Los desplegables de «Sobre mí» se abren y cierran con una transición de altura.
   Todo es opcional: con movimiento reducido o si algo falla, la web funciona igual, sin animar. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 0) Ampliar imágenes (lightbox) ----------
     Funciona siempre; con movimiento reducido se abre y cierra sin animar.
     Clic en la imagen ampliada: alterna entre «ajustar a pantalla» y «tamaño real».
     Se cierra con (cerrar), Esc o pulsando fuera de la imagen. */
  var ZOOM = '.synced-gif-gallery > img:not([data-gif])';

  function initLightbox() {
    var thumbs = document.querySelectorAll(ZOOM);
    if (!thumbs.length || typeof HTMLDialogElement === 'undefined') return;

    var EASE = 'cubic-bezier(.2, .65, .2, 1)';
    var dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.setAttribute('aria-label', 'Imagen ampliada');
    var big = document.createElement('img');
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'lightbox-close';
    closeBtn.textContent = '(cerrar)';
    dialog.appendChild(big);
    dialog.appendChild(closeBtn);
    document.body.appendChild(dialog);

    var current = null, busy = false;

    function inView(r) { return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth; }

    function open(thumb) {
      if (busy || dialog.open) return;
      busy = true; current = thumb;
      big.src = thumb.currentSrc || thumb.src;
      big.alt = thumb.alt;
      dialog.classList.remove('is-zoomed', 'is-closing');
      var ready = big.decode ? big.decode().catch(function () {}) : Promise.resolve();
      ready.then(function () {
        dialog.showModal();
        var from = thumb.getBoundingClientRect(), to = big.getBoundingClientRect();
        if (!reduceMotion && inView(from) && 'animate' in big) {
          big.style.transformOrigin = '0 0';
          big.animate([
            { transform: 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + (from.width / to.width) + ')' },
            { transform: 'none' }
          ], { duration: 460, easing: EASE });
          thumb.style.visibility = 'hidden';
        }
        busy = false;
      });
    }

    function close() {
      if (!dialog.open || busy) return;
      busy = true;
      var thumb = current;
      function finish() {
        dialog.close();
        dialog.classList.remove('is-closing', 'is-zoomed');
        if (thumb) thumb.style.visibility = '';
        busy = false;
      }
      var from = big.getBoundingClientRect(), to = thumb ? thumb.getBoundingClientRect() : null;
      if (reduceMotion || !to || !inView(to) || !('animate' in big) || dialog.classList.contains('is-zoomed')) {
        if (!reduceMotion && 'animate' in dialog) {
          dialog.classList.add('is-closing');
          dialog.animate({ opacity: [1, 0] }, { duration: 220, easing: 'ease-out' }).onfinish = finish;
        } else finish();
        return;
      }
      dialog.classList.add('is-closing');
      big.style.transformOrigin = '0 0';
      var a = big.animate([
        { transform: 'none' },
        { transform: 'translate(' + (to.left - from.left) + 'px,' + (to.top - from.top) + 'px) scale(' + (to.width / from.width) + ')' }
      ], { duration: 380, easing: EASE, fill: 'forwards' });
      a.onfinish = finish;
    }

    thumbs.forEach(function (img) {
      img.classList.add('zoomable');
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', 'Ampliar imagen: ' + img.alt);
      img.addEventListener('click', function () { open(img); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
      });
    });

    big.addEventListener('click', function (e) {
      e.stopPropagation();
      if (big.naturalWidth <= window.innerWidth * 0.92 && !dialog.classList.contains('is-zoomed')) return;
      dialog.classList.toggle('is-zoomed');
    });
    closeBtn.addEventListener('click', function (e) { e.stopPropagation(); close(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) close(); });
    dialog.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
  }

  try { initLightbox(); } catch (e) { /* sin lightbox, las imágenes se ven igual */ }

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

    // Lo que ya se ve al cargar se queda como está (sin volver a aparecer tras la transición de página);
    // solo se anima lo que empieza fuera de pantalla.
    targets.forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      el.classList.add('reveal');
      observer.observe(el);
    });
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

  /* ---------- 3) Anverso y reverso: imagen fija; el GIF se activa con hover (ratón) o con toque (móvil) ---------- */
  function initGifs() {
    var imgs = document.querySelectorAll('img[data-gif]');
    if (!imgs.length) return;
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    function play(img) { img.src = img.getAttribute('data-gif'); img.setAttribute('aria-pressed', 'true'); }
    function stop(img) { img.src = img.getAttribute('data-still'); img.setAttribute('aria-pressed', 'false'); }
    function isPlaying(img) { return img.getAttribute('aria-pressed') === 'true'; }

    // Precarga los GIF cuando el navegador está libre, para que al activarlos no haya espera.
    function preload() { imgs.forEach(function (img) { new Image().src = img.getAttribute('data-gif'); }); }
    if ('requestIdleCallback' in window) requestIdleCallback(preload, { timeout: 4000 }); else setTimeout(preload, 2500);

    imgs.forEach(function (img) {
      if (canHover) {
        img.addEventListener('mouseenter', function () { play(img); });
        img.addEventListener('mouseleave', function () { stop(img); });
      }
      // Toque en móvil (y clic con teclado/Intro en cualquier dispositivo)
      img.addEventListener('click', function (e) { if (canHover && e.detail) return; if (isPlaying(img)) stop(img); else play(img); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); img.click(); }
      });
    });
  }

  try { initGifs(); } catch (e) { /* sin script, se ve la imagen fija */ }
  try { initReveal(); } catch (e) { root.classList.remove('anim'); }
  try { initAccordions(); } catch (e) { /* si falla, los desplegables funcionan sin animación */ }
})();
