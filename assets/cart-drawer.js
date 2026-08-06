class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('keyup', (event) => {
      if (event.code === 'Escape') {
        this.close();
      }
    });

    const overlay = this.querySelector('#CartDrawer-Overlay');

    if (overlay) {
      overlay.addEventListener(
        'click',
        this.close.bind(this)
      );
    }

    this.setHeaderCartIconAccessibility();
  }

  setHeaderCartIconAccessibility() {
    const cartLink =
      document.querySelector('#cart-icon-bubble');

    if (!cartLink) {
      return;
    }

    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');

    cartLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.open(cartLink);
    });

    cartLink.addEventListener('keydown', (event) => {
      if (
        event.code.toUpperCase() === 'SPACE' ||
        event.code.toUpperCase() === 'ENTER'
      ) {
        event.preventDefault();
        this.open(cartLink);
      }
    });
  }

  open(triggeredBy) {
    if (triggeredBy) {
      this.setActiveElement(triggeredBy);
    }

    window.setTimeout(() => {
      this.classList.add('animate', 'active');
    }, 10);

    document.body.classList.add('overflow-hidden');

    window.BojaxCartReservationTimer?.start();
  }

  close() {
    this.classList.remove('active');
    document.body.classList.remove('overflow-hidden');

    if (
      typeof removeTrapFocus === 'function'
    ) {
      removeTrapFocus(this.activeElement);
    }
  }

  renderContents(parsedState) {
    this.productId = parsedState.id;

    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);

      const sectionHTML =
        parsedState.sections?.[section.id];

      if (!sectionElement || !sectionHTML) {
        return;
      }

      const innerHTML = this.getSectionInnerHTML(
        sectionHTML,
        section.selector
      );

      if (innerHTML !== null) {
        sectionElement.innerHTML = innerHTML;
      }
    });

    window.setTimeout(() => {
      const overlay =
        this.querySelector('#CartDrawer-Overlay');

      if (overlay) {
        overlay.addEventListener(
          'click',
          this.close.bind(this)
        );
      }

      this.open();
      window.BojaxCartReservationTimer?.start();
    }, 20);
  }

  getSectionInnerHTML(
    html,
    selector = '.shopify-section'
  ) {
    const documentHTML =
      new DOMParser().parseFromString(
        html,
        'text/html'
      );

    const element =
      documentHTML.querySelector(selector);

    return element ? element.innerHTML : null;
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer'
      },
      {
        id: 'cart-icon-bubble'
      }
    ];
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

if (!customElements.get('cart-drawer')) {
  customElements.define(
    'cart-drawer',
    CartDrawer
  );
}

if (
  typeof CartItems !== 'undefined' &&
  !customElements.get('cart-drawer-items')
) {
  class CartDrawerItems extends CartItems {
    getSectionsToRender() {
      return [
        {
          id: 'CartDrawer',
          section: 'cart-drawer',
          selector: '.drawer__inner'
        },
        {
          id: 'cart-icon-bubble',
          section: 'cart-icon-bubble',
          selector: '.shopify-section'
        }
      ];
    }
  }

  customElements.define(
    'cart-drawer-items',
    CartDrawerItems
  );
}

/* =========================================================
   BOJAX CART RESERVATION TIMER
   Persistent 15-minute countdown
   ========================================================= */

(() => {
  const STORAGE_KEY =
    'bojax-course-reservation-expiry';

  const DURATION =
    15 * 60 * 1000;

  let interval = null;

  const getTimerElements = () => {
    return document.querySelectorAll(
      '[data-bojax-cart-timer]'
    );
  };

  const getStoredExpiry = () => {
    try {
      return Number(
        window.localStorage.getItem(STORAGE_KEY)
      );
    } catch (error) {
      return 0;
    }
  };

  const saveExpiry = (expiry) => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        String(expiry)
      );
    } catch (error) {
      console.warn(
        '[Bojax timer] Local storage unavailable.',
        error
      );
    }
  };

  const createExpiry = () => {
    const expiry =
      Date.now() + DURATION;

    saveExpiry(expiry);

    return expiry;
  };

  const getExpiry = () => {
    const storedExpiry =
      getStoredExpiry();

    if (
      Number.isFinite(storedExpiry) &&
      storedExpiry > Date.now()
    ) {
      return storedExpiry;
    }

    return createExpiry();
  };

  const formatTime = (milliseconds) => {
    const totalSeconds =
      Math.max(
        0,
        Math.ceil(milliseconds / 1000)
      );

    const minutes =
      Math.floor(totalSeconds / 60);

    const seconds =
      totalSeconds % 60;

    return (
      String(minutes).padStart(2, '0') +
      ':' +
      String(seconds).padStart(2, '0')
    );
  };

  const update = () => {
    const timerElements =
      getTimerElements();

    if (!timerElements.length) {
      return;
    }

    let expiry =
      getExpiry();

    let remaining =
      expiry - Date.now();

    if (remaining <= 0) {
      expiry =
        createExpiry();

      remaining =
        expiry - Date.now();
    }

    const formatted =
      formatTime(remaining);

    timerElements.forEach((timer) => {
      timer.textContent = formatted;
    });
  };

  const start = () => {
    window.clearInterval(interval);

    update();

    interval =
      window.setInterval(update, 1000);
  };

  const reset = () => {
    createExpiry();
    start();
  };

  window.BojaxCartReservationTimer = {
    start,
    reset,
    update
  };

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      start,
      { once: true }
    );
  } else {
    start();
  }

  document.addEventListener(
    'cart:updated',
    start
  );

  const observer =
    new MutationObserver(() => {
      if (
        document.querySelector(
          '[data-bojax-cart-timer]'
        )
      ) {
        start();
      }
    });

  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true
    }
  );
})();
