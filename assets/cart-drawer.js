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
      overlay.addEventListener('click', this.close.bind(this));
    }

    this.setHeaderCartIconAccessibility();
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector('#cart-icon-bubble');

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
      if (event.code.toUpperCase() === 'SPACE') {
        event.preventDefault();
        this.open(cartLink);
      }
    });
  }

  open(triggeredBy) {
    if (this.classList.contains('active')) {
      return;
    }

    if (triggeredBy) {
      this.setActiveElement(triggeredBy);
    }

    const cartDrawerNote = this.querySelector(
      '[id^="Details-"] summary'
    );

    if (
      cartDrawerNote &&
      !cartDrawerNote.hasAttribute('role')
    ) {
      this.setSummaryAccessibility(cartDrawerNote);
    }

    setTimeout(() => {
      this.classList.add('animate', 'active');
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn =
          this.classList.contains('is-empty')
            ? this.querySelector('.drawer__inner-empty')
            : document.getElementById('CartDrawer');

        const focusElement =
          this.querySelector('.drawer__inner') ||
          this.querySelector('.drawer__close');

        if (
          typeof trapFocus === 'function' &&
          containerToTrapFocusOn
        ) {
          trapFocus(
            containerToTrapFocusOn,
            focusElement
          );
        }
      },
      { once: true }
    );

    document.body.classList.add('overflow-hidden');

    this.querySelector(
      'cart-drawer-items'
    )?.dispatchViewEvent?.();
  }

  close() {
    this.classList.remove('active');

    if (typeof removeTrapFocus === 'function') {
      removeTrapFocus(this.activeElement);
    }

    document.body.classList.remove('overflow-hidden');
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute(
      'aria-expanded',
      'false'
    );

    if (
      cartDrawerNote.nextElementSibling?.getAttribute(
        'id'
      )
    ) {
      cartDrawerNote.setAttribute(
        'aria-controls',
        cartDrawerNote.nextElementSibling.id
      );
    }

    cartDrawerNote.addEventListener(
      'click',
      (event) => {
        event.currentTarget.setAttribute(
          'aria-expanded',
          !event.currentTarget
            .closest('details')
            .hasAttribute('open')
        );
      }
    );

    if (
      typeof onKeyUpEscape === 'function'
    ) {
      cartDrawerNote.parentElement.addEventListener(
        'keyup',
        onKeyUpEscape
      );
    }
  }

  renderContents(parsedState) {
    const drawerInner =
      this.querySelector('.drawer__inner');

    if (
      drawerInner?.classList.contains('is-empty')
    ) {
      drawerInner.classList.remove('is-empty');
    }

    this.productId = parsedState.id;

    this.getSectionsToRender().forEach(
      (section) => {
        const sectionElement = section.selector
          ? document.querySelector(section.selector)
          : document.getElementById(section.id);

        const sectionHTML =
          parsedState.sections?.[section.id];

        if (!sectionElement || !sectionHTML) {
          return;
        }

        const newHTML =
          this.getSectionInnerHTML(
            sectionHTML,
            section.selector
          );

        if (newHTML !== null) {
          sectionElement.innerHTML = newHTML;
        }
      }
    );

    setTimeout(() => {
      const overlay =
        this.querySelector('#CartDrawer-Overlay');

      if (overlay) {
        overlay.addEventListener(
          'click',
          this.close.bind(this)
        );
      }

      this.open();
    });
  }

  getSectionInnerHTML(
    html,
    selector = '.shopify-section'
  ) {
    const parsedDocument =
      new DOMParser().parseFromString(
        html,
        'text/html'
      );

    const element =
      parsedDocument.querySelector(selector);

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

  getSectionDOM(
    html,
    selector = '.shopify-section'
  ) {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector);
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
