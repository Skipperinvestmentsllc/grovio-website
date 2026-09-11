(function () {
  'use strict';

  var storageKey = 'grovio_website_consent_v1';
  var googleMeasurementId = 'G-ZM2WLE995S';
  var metaPixelId = '1483572783552950';
  var pinterestTagId = '2613547423528';
  var banner;
  var compactControl;
  var consentPanel;
  var preferences;
  var initialActions;
  var analyticsInput;
  var marketingInput;

  function readConsent() {
    try {
      var stored = window.localStorage.getItem(storageKey);
      if (!stored) return null;
      var parsed = JSON.parse(stored);
      if (typeof parsed.analytics !== 'boolean' || typeof parsed.marketing !== 'boolean') return null;
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function saveConsent(consent) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        analytics: Boolean(consent.analytics),
        marketing: Boolean(consent.marketing),
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      // Without browser storage, the selection applies only until the next page load.
    }
  }

  function loadScript(id, src, onLoad) {
    if (document.getElementById(id)) {
      if (onLoad) onLoad();
      return;
    }
    var script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.src = src;
    if (onLoad) script.addEventListener('load', onLoad, { once: true });
    document.head.appendChild(script);
  }

  function loadGoogleAnalytics(consent) {
    if (window.grovioGoogleAnalyticsLoaded) return;
    window.grovioGoogleAnalyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_storage: consent.marketing ? 'granted' : 'denied',
      ad_user_data: consent.marketing ? 'granted' : 'denied',
      ad_personalization: consent.marketing ? 'granted' : 'denied'
    });
    loadScript('grovio-google-tag', 'https://www.googletagmanager.com/gtag/js?id=' + googleMeasurementId, function () {
      window.gtag('js', new Date());
      window.gtag('config', googleMeasurementId, { anonymize_ip: true });
    });
  }

  function loadMetaPixel() {
    if (window.grovioMetaPixelLoaded) return;
    window.grovioMetaPixelLoaded = true;
    if (!window.fbq) {
      var fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
      fbq.queue = [];
      fbq.loaded = true;
      fbq.version = '2.0';
      window.fbq = fbq;
      window._fbq = fbq;
    }
    window.fbq('init', metaPixelId);
    window.fbq('track', 'PageView');
    loadScript('grovio-meta-pixel', 'https://connect.facebook.net/en_US/fbevents.js');
  }

  function loadPinterestTag() {
    if (window.grovioPinterestLoaded) return;
    window.grovioPinterestLoaded = true;
    if (!window.pintrk) {
      var pintrk = function () { pintrk.queue.push(Array.prototype.slice.call(arguments)); };
      pintrk.queue = [];
      pintrk.version = '3.0';
      window.pintrk = pintrk;
    }
    window.pintrk('load', pinterestTagId);
    window.pintrk('page');
    loadScript('grovio-pinterest-tag', 'https://s.pinimg.com/ct/core.js');
  }

  function loadOpenAIConversion() {
    var openAIPixel = document.querySelector('meta[name="grovio-openai-conversion-pixel"]');
    if (!openAIPixel || window.grovioOpenAIConversionLoaded) return;
    window.grovioOpenAIConversionLoaded = true;
    if (!window.oaiq) {
      var oaiq = function () { oaiq.q.push(arguments); };
      oaiq.q = [];
      window.oaiq = oaiq;
    }
    window.oaiq('init', { pixelId: openAIPixel.content, debug: false });
    loadScript('grovio-openai-conversion', 'https://bzrcdn.openai.com/sdk/oaiq.min.js');
  }

  function applyConsent(consent) {
    if (consent.analytics) loadGoogleAnalytics(consent);
    if (consent.marketing) {
      loadMetaPixel();
      loadPinterestTag();
      loadOpenAIConversion();
    }
  }

  function hideBanner() {
    banner.classList.remove('is-visible', 'is-compact');
    banner.setAttribute('aria-hidden', 'true');
  }

  function showCompact() {
    preferences.hidden = true;
    initialActions.hidden = false;
    consentPanel.hidden = true;
    compactControl.hidden = false;
    compactControl.setAttribute('aria-expanded', 'false');
    banner.classList.remove('is-visible');
    banner.classList.add('is-compact');
    banner.setAttribute('aria-hidden', 'false');
  }

  function showInitial() {
    showCompact();
  }

  function showNotice() {
    preferences.hidden = true;
    initialActions.hidden = false;
    consentPanel.hidden = false;
    compactControl.hidden = true;
    compactControl.setAttribute('aria-expanded', 'true');
    banner.classList.remove('is-compact');
    banner.classList.add('is-visible');
    banner.setAttribute('aria-hidden', 'false');
  }

  function showPreferences() {
    var consent = readConsent() || { analytics: false, marketing: false };
    analyticsInput.checked = consent.analytics;
    marketingInput.checked = consent.marketing;
    initialActions.hidden = true;
    preferences.hidden = false;
    consentPanel.hidden = false;
    compactControl.hidden = true;
    compactControl.setAttribute('aria-expanded', 'true');
    banner.classList.remove('is-compact');
    banner.classList.add('is-visible');
    banner.setAttribute('aria-hidden', 'false');
    analyticsInput.focus();
  }

  function updateConsent(consent) {
    var previous = readConsent();
    saveConsent(consent);
    applyConsent(consent);
    hideBanner();

    if (previous && ((previous.analytics && !consent.analytics) || (previous.marketing && !consent.marketing))) {
      window.setTimeout(function () { window.location.reload(); }, 0);
    }
  }

  function addPrivacyChoicesControl() {
    var footer = document.querySelector('footer.site-footer, footer.grovio-footer, footer.footer') || document.querySelector('footer');
    if (!footer || footer.querySelector('[data-grovio-manage-consent]')) return;
    var control = document.createElement('button');
    control.type = 'button';
    control.className = 'grovio-consent-manage';
    control.dataset.grovioManageConsent = 'true';
    control.textContent = 'Privacy choices';
    control.addEventListener('click', showPreferences);
    footer.appendChild(control);
  }

  function bindActions() {
    banner.addEventListener('click', function (event) {
      var action = event.target.closest('[data-grovio-consent-action]');
      if (!action) return;
      var choice = action.dataset.grovioConsentAction;
      if (choice === 'essential') updateConsent({ analytics: false, marketing: false });
      if (choice === 'allow-all') updateConsent({ analytics: true, marketing: true });
      if (choice === 'open') showNotice();
      if (choice === 'manage') showPreferences();
      if (choice === 'save') updateConsent({ analytics: analyticsInput.checked, marketing: marketingInput.checked });
      if (choice === 'collapse') {
        if (readConsent()) hideBanner(); else showCompact();
      }
      if (choice === 'cancel') {
        if (readConsent()) hideBanner(); else showCompact();
      }
    });
  }

  function mountBanner() {
    banner = document.createElement('section');
    banner.className = 'grovio-consent';
    banner.id = 'grovioConsent';
    banner.setAttribute('aria-label', 'Website privacy choices');
    banner.setAttribute('aria-hidden', 'true');
    banner.innerHTML = [
      '<button class="grovio-consent-tab" type="button" data-grovio-consent-action="open" aria-expanded="false">Privacy choices <span aria-hidden="true">&#8964;</span></button>',
      '<div class="grovio-consent-panel" data-consent-panel hidden>',
      '<div class="grovio-consent-panel-header">',
      '<div class="grovio-consent-copy">',
      '<h2 class="grovio-consent-title" id="grovioConsentTitle">Your privacy, your choice.</h2>',
      '<p>We use optional analytics and marketing tools to understand visits and measure campaigns. You can use grovioapp.com without them. <a href="/privacy#website-privacy-choices">Learn more</a>.</p>',
      '</div>',
      '<button class="grovio-consent-close" type="button" data-grovio-consent-action="collapse" aria-label="Close privacy choices">&times;</button>',
      '</div>',
      '<div class="grovio-consent-actions" data-consent-initial-actions>',
      '<button class="grovio-consent-button" type="button" data-grovio-consent-action="essential">Use essential only</button>',
      '<button class="grovio-consent-button grovio-consent-button--text" type="button" data-grovio-consent-action="manage">Manage choices</button>',
      '<button class="grovio-consent-button grovio-consent-button--primary" type="button" data-grovio-consent-action="allow-all">Allow optional cookies</button>',
      '</div>',
      '<form class="grovio-consent-preferences" data-consent-preferences hidden>',
      '<label class="grovio-consent-option grovio-consent-option--essential"><input type="checkbox" checked disabled><span><strong>Essential</strong><span>Needed to remember this privacy choice and keep the website working.</span></span></label>',
      '<label class="grovio-consent-option"><input type="checkbox" data-consent-analytics><span><strong>Analytics</strong><span>Helps us understand which pages and resources are useful.</span></span></label>',
      '<label class="grovio-consent-option"><input type="checkbox" data-consent-marketing><span><strong>Marketing</strong><span>Measures advertising and campaign performance.</span></span></label>',
      '<div class="grovio-consent-actions"><button class="grovio-consent-button" type="button" data-grovio-consent-action="cancel">Cancel</button><button class="grovio-consent-button grovio-consent-button--primary" type="button" data-grovio-consent-action="save">Save choices</button></div>',
      '</form>',
      '</div>'
    ].join('');
    document.body.appendChild(banner);
    compactControl = banner.querySelector('.grovio-consent-tab');
    consentPanel = banner.querySelector('[data-consent-panel]');
    preferences = banner.querySelector('[data-consent-preferences]');
    initialActions = banner.querySelector('[data-consent-initial-actions]');
    analyticsInput = banner.querySelector('[data-consent-analytics]');
    marketingInput = banner.querySelector('[data-consent-marketing]');
    bindActions();
  }

  function init() {
    mountBanner();
    addPrivacyChoicesControl();
    var consent = readConsent();
    if (consent) applyConsent(consent); else showInitial();
    window.grovioWebsiteConsent = { openPreferences: showPreferences };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
