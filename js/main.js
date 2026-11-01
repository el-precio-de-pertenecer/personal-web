// Cambio de idioma ES/EN compartido por todas las páginas.
// Recuerda la elección del visitante al navegar entre páginas.
(function () {
  var STORAGE_KEY = 'lang';
  var buttons = document.querySelectorAll('[data-lang]');

  function getSavedLanguage() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'en' || saved === 'es' ? saved : null;
    } catch (e) {
      return null;
    }
  }

  function saveLanguage(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      // Sin almacenamiento disponible: la web sigue funcionando, solo no recuerda el idioma.
    }
  }

  function setLanguage(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-es]').forEach(function (element) {
      element.hidden = lang !== 'es';
    });
    document.querySelectorAll('[data-en]').forEach(function (element) {
      element.hidden = lang !== 'en';
    });
    buttons.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
    });
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', function () {
      var lang = button.dataset.lang;
      setLanguage(lang);
      saveLanguage(lang);
    });
  });

  setLanguage(getSavedLanguage() || 'es');
})();
