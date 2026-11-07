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
  var ZOOM = '.synced-gif-gallery > img:not([data-gif]), .carousel-track img, .post-grid > img, .gallery-zoom > img';

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
    var prevBtn = document.createElement('button'), nextBtn = document.createElement('button');
    prevBtn.type = nextBtn.type = 'button';
    prevBtn.className = 'lightbox-arrow lightbox-prev';
    nextBtn.className = 'lightbox-arrow lightbox-next';
    var svg = function (d) { return '<svg viewBox="0 0 24 48" width="14" height="28" aria-hidden="true" focusable="false"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="butt" stroke-linejoin="miter"/></svg>'; };
    prevBtn.innerHTML = svg('M20 4 L4 24 L20 44'); nextBtn.innerHTML = svg('M4 4 L20 24 L4 44');
    prevBtn.setAttribute('aria-label', 'Imagen anterior'); nextBtn.setAttribute('aria-label', 'Imagen siguiente');
    var stage = document.createElement('div');
    stage.className = 'lightbox-stage';
    stage.appendChild(big);
    dialog.appendChild(stage);
    dialog.appendChild(closeBtn);
    dialog.appendChild(prevBtn);
    dialog.appendChild(nextBtn);
    document.body.appendChild(dialog);

    var current = null, busy = false, group = [];

    // Las imágenes que se pueden recorrer con las flechas: las de la misma galería o carrusel.
    function groupOf(thumb) {
      var box = thumb.closest('.synced-gif-gallery, .carousel, .post-grid, .gallery-zoom') || document;
      return Array.prototype.filter.call(box.querySelectorAll(ZOOM), function (el) { return el.tagName === 'IMG'; });
    }

    // Pasa a la imagen anterior / siguiente sin cerrar el visor.
    function step(delta) {
      if (!dialog.open || busy || group.length < 2) return;
      var i = group.indexOf(current);
      var next = group[(i + delta + group.length) % group.length];
      busy = true;
      var src = next.currentSrc || next.src;
      var probe = new Image(); probe.src = src;
      (probe.decode ? probe.decode().catch(function () {}) : Promise.resolve()).then(function () {
        // Fundido cruzado: la imagen anterior se desvanece mientras aparece la nueva.
        var canFade = !reduceMotion && 'animate' in big;
        var ghost = null;
        if (canFade) {
          var r = big.getBoundingClientRect();
          ghost = document.createElement('img');
          ghost.className = 'lightbox-ghost';
          ghost.alt = '';
          ghost.src = big.src;
          ghost.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
          dialog.appendChild(ghost);
        }
        big.getAnimations().forEach(function (a) { a.cancel(); });
        if (current) current.style.visibility = '';
        current = next;
        big.src = src; big.alt = next.alt;
        dialog.classList.remove('is-zoomed');
        dialog.scrollLeft = 0; dialog.scrollTop = 0;
        fit();
        if (canFade) {
          var opt = { duration: 520, easing: 'cubic-bezier(.4, 0, .2, 1)' };
          big.animate({ opacity: [0, 1] }, opt);
          ghost.animate({ opacity: [1, 0] }, opt).onfinish = function () { ghost.remove(); };
          if (!next.closest('.carousel')) next.style.visibility = 'hidden';
        }
        busy = false;
      });
    }
    prevBtn.addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
    nextBtn.addEventListener('click', function (e) { e.stopPropagation(); step(1); });
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });
    // Deslizar con el dedo en la imagen ajustada a pantalla también pasa de imagen.
    var tx = null;
    dialog.addEventListener('touchstart', function (e) { tx = !dialog.classList.contains('is-zoomed') && e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
    dialog.addEventListener('touchend', function (e) {
      if (tx === null) return;
      var dx = e.changedTouches[0].clientX - tx; tx = null;
      if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    }, { passive: true });

    // Tamaño explícito en píxeles (más fiable en Safari que max-width/max-height dentro de un flex).
    function fit() {
      var nw = big.naturalWidth || 1, nh = big.naturalHeight || 1, ar = nw / nh;
      var w = Math.min(window.innerWidth * 0.92, window.innerHeight * 0.88 * ar);
      if (dialog.classList.contains('is-zoomed')) w = Math.max(nw, w);
      big.style.width = Math.round(w) + 'px';
      big.style.height = Math.round(w / ar) + 'px';
    }
    window.addEventListener('resize', function () { if (dialog.open) fit(); });

    function inView(r) { return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth; }

    function open(thumb) {
      if (busy || dialog.open) return;
      busy = true; current = thumb;
      group = groupOf(thumb);
      dialog.classList.toggle('has-nav', group.length > 1);
      big.getAnimations().forEach(function (a) { a.cancel(); });
      big.src = thumb.currentSrc || thumb.src;
      big.alt = thumb.alt;
      dialog.classList.remove('is-zoomed', 'is-closing');
      var ready = big.decode ? big.decode().catch(function () {}) : Promise.resolve();
      ready.then(function () {
        fit();
        dialog.showModal();
        var from = thumb.getBoundingClientRect(), to = big.getBoundingClientRect();
        if (!reduceMotion && !thumb.closest('.carousel') && inView(from) && 'animate' in big) {
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
        big.getAnimations().forEach(function (a) { a.cancel(); });   // si no, la animación de cierre dejaba la imagen descentrada al abrir otra
        big.style.width = big.style.height = '';
        if (thumb) thumb.style.visibility = '';
        busy = false;
      }
      var from = big.getBoundingClientRect(), to = thumb ? thumb.getBoundingClientRect() : null;
      if (reduceMotion || !to || (thumb && thumb.closest('.carousel')) || !inView(to) || !('animate' in big) || dialog.classList.contains('is-zoomed')) {
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
      if (!img.closest('.carousel')) {   // las diapositivas ocultas del carrusel no deben recibir el foco
        img.tabIndex = 0;
        img.setAttribute('role', 'button');
        img.setAttribute('aria-label', 'Ampliar imagen: ' + img.alt);
      }
      img.addEventListener('click', function () { open(img); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
      });
    });

    big.addEventListener('click', function (e) {
      e.stopPropagation();
      if (big.naturalWidth <= window.innerWidth * 0.92 && !dialog.classList.contains('is-zoomed')) return;
      // Al pasar a tamaño real, el zoom se centra en el punto donde se ha hecho clic (no en la esquina).
      var r = big.getBoundingClientRect();
      var fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      var zoomed = dialog.classList.toggle('is-zoomed');
      fit();
      if (zoomed) {
        dialog.scrollLeft = big.offsetLeft + fx * big.offsetWidth - dialog.clientWidth / 2;
        dialog.scrollTop = big.offsetTop + fy * big.offsetHeight - dialog.clientHeight / 2;
      } else { dialog.scrollLeft = 0; dialog.scrollTop = 0; }
    });
    closeBtn.addEventListener('click', function (e) { e.stopPropagation(); close(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) close(); });
    dialog.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
  }

  /* ---------- 0b) Carrusel automático ----------
     Cambia solo cada pocos segundos (la barra de progreso marca el tiempo), se pausa al pasar el cursor
     o al enfocarlo, y se puede cambiar a mano. Con movimiento reducido no avanza solo. */
  function initCarousels() {
    document.querySelectorAll('.carousel').forEach(function (car) {
      var track = car.querySelector('.carousel-track');
      var slides = Array.prototype.slice.call(car.querySelectorAll('.carousel-track img'));
      if (!track || slides.length < 2) return;
      var bars = document.createElement('div');
      bars.className = 'carousel-bars';
      var buttons = slides.map(function (img, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Ver ' + (i + 1) + ' de ' + slides.length + ': ' + img.alt);
        b.addEventListener('click', function () { go(i); });
        b.addEventListener('animationend', function () { go((current + 1) % slides.length); });
        bars.appendChild(b);
        return b;
      });
      car.appendChild(bars);
      var current = 0;
      function go(i) {
        current = i;
        track.parentElement.scrollLeft = 0;
        // la activa queda centrada (vale también cuando las diapositivas tienen anchos distintos)
        var offset = (track.parentElement.clientWidth - slides[i].offsetWidth) / 2 - slides[i].offsetLeft;
        if (!car.classList.contains('carousel--libro')) track.style.transform = 'translateX(' + offset + 'px)';   // el fotolibro cambia por opacidad
        slides.forEach(function (img, k) { img.classList.toggle('is-active', k === i); });
        buttons.forEach(function (b, k) {
          b.classList.remove('is-active');
          if (k === i) { void b.offsetWidth; b.classList.add('is-active'); b.setAttribute('aria-current', 'true'); } else b.removeAttribute('aria-current');
        });
      }
      // Pulsar una diapositiva que asoma la trae al frente; pulsar la activa la amplía (lightbox).
      slides.forEach(function (img, k) {
        img.addEventListener('click', function (e) { if (k !== current) { e.stopImmediatePropagation(); go(k); } });
      });
      window.addEventListener('resize', function () { go(current); });
      car.classList.add('is-ready');
      go(0);
      // No avanza mientras no se ve en pantalla, para que al llegar se empiece por la primera.
      if ('IntersectionObserver' in window) {
        car.classList.add('is-offscreen');
        new IntersectionObserver(function (es) { car.classList.toggle('is-offscreen', !es[0].isIntersecting); }, { threshold: 0.4 }).observe(car);
      }
    });
  }

  try { initCarousels(); } catch (e) { /* sin script se ve la primera imagen */ }
  try { initLightbox(); } catch (e) { /* sin lightbox, las imágenes se ven igual */ }

  if (reduceMotion) return;

  /* ---------- 1) Aparición de imágenes al hacer scroll ----------
     Debe coincidir con la lista de selectores del bloque «Animaciones» de css/style.css. */
  var REVEAL = '.portfolio-project, .about-fixed img, .case-gallery > img, .case-gallery > video, .synced-gif-gallery > img, .carousel, .post-grid > img';

  function initReveal() {
    if (!root.classList.contains('anim') || !('IntersectionObserver' in window)) return;

    // Lo que ya entra con animación CSS al cargar (apartado 4 de style.css) no se vuelve a animar aquí.
    var INTRO = '.case-gallery > :first-child, .post-grid > img:nth-child(-n+4), .portfolio-grid .portfolio-project:nth-child(-n+4), .about-fixed img';
    var targets = Array.prototype.filter.call(document.querySelectorAll(REVEAL), function (el) { return !el.matches(INTRO); });
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
