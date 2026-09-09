(function () {
  function initNavigation() {
    var burger = document.getElementById('grovioNavBurger');
    var panel = document.getElementById('grovioNavPanel');
    var overlay = document.getElementById('grovioNavOverlay');
    if (!burger || !panel || !overlay || burger.dataset.navReady === 'true') return;

    burger.dataset.navReady = 'true';
    function openMenu() {
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Close site menu');
      panel.setAttribute('aria-hidden', 'false');
      panel.classList.add('is-open');
      overlay.classList.add('is-open');
      document.body.classList.add('grovio-nav-locked');
    }
    function closeMenu() {
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Open site menu');
      panel.setAttribute('aria-hidden', 'true');
      panel.classList.remove('is-open');
      overlay.classList.remove('is-open');
      document.body.classList.remove('grovio-nav-locked');
    }

    burger.addEventListener('click', function () {
      if (burger.getAttribute('aria-expanded') === 'true') closeMenu(); else openMenu();
    });
    overlay.addEventListener('click', closeMenu);
    panel.addEventListener('click', function (event) {
      if (event.target.closest('a')) closeMenu();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        burger.focus();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initNavigation);
  else initNavigation();
}());
