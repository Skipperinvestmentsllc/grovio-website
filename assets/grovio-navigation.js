(function () {
  function initNavigation() {
    var burger = document.getElementById('grovioNavBurger');
    var panel = document.getElementById('grovioNavPanel');
    var overlay = document.getElementById('grovioNavOverlay');
    if (!burger || !panel || !overlay || burger.dataset.navReady === 'true') return;

    burger.dataset.navReady = 'true';
    var menuLabel = burger.querySelector('.grovio-nav-menu-label');
    var closedLabel = burger.classList.contains('grovio-nav-burger--landing') ? 'Explore grovio' : 'Menu';
    var dropdownButtons = Array.prototype.slice.call(document.querySelectorAll('[data-grovio-dropdown]'));

    function setMenuLabel(label) {
      if (menuLabel) menuLabel.textContent = label;
    }
    function closeDropdown(button) {
      var dropdownPanel = document.getElementById(button.getAttribute('data-grovio-dropdown'));
      button.setAttribute('aria-expanded', 'false');
      if (dropdownPanel) dropdownPanel.hidden = true;
    }
    function closeDropdowns(exceptButton) {
      dropdownButtons.forEach(function (button) {
        if (button !== exceptButton) closeDropdown(button);
      });
    }
    function openMenu() {
      closeDropdowns();
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Close site menu');
      setMenuLabel('Close');
      panel.setAttribute('aria-hidden', 'false');
      panel.classList.add('is-open');
      overlay.classList.add('is-open');
      document.body.classList.add('grovio-nav-locked');
    }
    function closeMenu() {
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', closedLabel === 'Menu' ? 'Open site menu' : closedLabel);
      setMenuLabel(closedLabel);
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
    dropdownButtons.forEach(function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var dropdownPanel = document.getElementById(button.getAttribute('data-grovio-dropdown'));
        var isOpen = button.getAttribute('aria-expanded') === 'true';
        closeDropdowns(button);
        button.setAttribute('aria-expanded', String(!isOpen));
        if (dropdownPanel) dropdownPanel.hidden = isOpen;
      });
    });
    document.addEventListener('click', function (event) {
      if (!event.target.closest('.grovio-nav-dropdown')) closeDropdowns();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      var openDropdown = dropdownButtons.find(function (button) {
        return button.getAttribute('aria-expanded') === 'true';
      });
      if (openDropdown) {
        closeDropdown(openDropdown);
        openDropdown.focus();
        return;
      }
      if (burger.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        burger.focus();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initNavigation);
  else initNavigation();
}());
