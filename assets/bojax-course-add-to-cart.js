(() => {
  const COURSE_HANDLE = 'bojax-course';
  const COURSE_URL_PART = `/products/${COURSE_HANDLE}`;

  const BUTTON_SELECTOR = [
    `a[href*="${COURSE_URL_PART}"]`,
    '[data-bojax-course-add]'
  ].join(',');

  let cachedVariantId = null;
  let variantRequest = null;

  const getCourseVariantId = async () => {
    if (cachedVariantId) {
      return cachedVariantId;
    }

    if (variantRequest) {
      return variantRequest;
    }

    variantRequest = fetch(
      `${window.Shopify.routes.root}products/${COURSE_HANDLE}.js`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error('The Bojax Course product could not be loaded.');
        }

        return response.json();
      })
      .then((product) => {
        const availableVariant =
          product.variants.find((variant) => variant.available) ||
          product.variants[0];

        if (!availableVariant) {
          throw new Error('No product variant was found.');
        }

        cachedVariantId = availableVariant.id;
        return cachedVariantId;
      })
      .finally(() => {
        variantRequest = null;
      });

    return variantRequest;
  };

  const getButtonTextElement = (button) => {
    return (
      button.querySelector(
        '.bojax-course-add-button__text, ' +
        '.bojax-curriculum__button-text, ' +
        '.bojax-transformations__button-text'
      ) || button
    );
  };

  const setButtonLoading = (button, loading) => {
    const textElement = getButtonTextElement(button);

    if (loading) {
      if (!button.dataset.originalHtml) {
        button.dataset.originalHtml = button.innerHTML;
      }

      button.classList.add('is-loading');
      button.setAttribute('aria-busy', 'true');
      button.style.pointerEvents = 'none';

      if (textElement === button) {
        button.innerHTML = `
          <span class="bojax-course-add-button__loading">
            <span class="bojax-course-add-button__spinner"></span>
            Adding to cart
          </span>
        `;
      }
    } else {
      button.classList.remove('is-loading');
      button.removeAttribute('aria-busy');
      button.style.pointerEvents = '';

      if (button.dataset.originalHtml) {
        button.innerHTML = button.dataset.originalHtml;
      }
    }
  };

  const showButtonSuccess = (button) => {
    if (!button.dataset.originalHtml) {
      return;
    }

    button.innerHTML = `
      <span class="bojax-course-add-button__success">
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M5 10.5 8.2 13.7 15.5 6.2"
            fill="none"
            stroke="currentColor"
            stroke-width="2.3"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></path>
        </svg>

        Added to cart
      </span>
    `;

    window.setTimeout(() => {
      if (button.dataset.originalHtml) {
        button.innerHTML = button.dataset.originalHtml;
      }
    }, 1800);
  };

  const showButtonError = (button) => {
    if (!button.dataset.originalHtml) {
      return;
    }

    button.innerHTML = `
      <span class="bojax-course-add-button__error">
        Could not add to cart
      </span>
    `;

    window.setTimeout(() => {
      if (button.dataset.originalHtml) {
        button.innerHTML = button.dataset.originalHtml;
      }
    }, 2200);
  };

  const openCartNotification = (cartResponse) => {
    const cartNotification = document.querySelector('cart-notification');

    if (
      cartNotification &&
      typeof cartNotification.renderContents === 'function'
    ) {
      cartNotification.renderContents(cartResponse);
      return true;
    }

    const cartDrawer = document.querySelector('cart-drawer');

    if (
      cartDrawer &&
      typeof cartDrawer.renderContents === 'function'
    ) {
      cartDrawer.renderContents(cartResponse);
      return true;
    }

    return false;
  };

  const getCartSections = () => {
    const cartNotification = document.querySelector('cart-notification');

    if (
      cartNotification &&
      typeof cartNotification.getSectionsToRender === 'function'
    ) {
      return cartNotification
        .getSectionsToRender()
        .map((section) => section.id);
    }

    const cartDrawer = document.querySelector('cart-drawer');

    if (
      cartDrawer &&
      typeof cartDrawer.getSectionsToRender === 'function'
    ) {
      return cartDrawer
        .getSectionsToRender()
        .map((section) => section.id);
    }

    return [
      'cart-notification-product',
      'cart-notification-button',
      'cart-icon-bubble'
    ];
  };

  const addCourseToCart = async (button) => {
    if (button.dataset.bojaxAdding === 'true') {
      return;
    }

    button.dataset.bojaxAdding = 'true';
    setButtonLoading(button, true);

    try {
      const variantId = await getCourseVariantId();
      const sections = getCartSections();

      const formData = new FormData();

      formData.append('id', variantId);
      formData.append('quantity', '1');
      formData.append('sections', sections.join(','));
      formData.append(
        'sections_url',
        `${window.location.pathname}${window.location.search}`
      );

      const response = await fetch(
        `${window.Shopify.routes.root}cart/add.js`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: formData
        }
      );

      const result = await response.json();

      if (!response.ok || result.status) {
        throw new Error(
          result.description ||
          result.message ||
          'The product could not be added.'
        );
      }

      setButtonLoading(button, false);
      showButtonSuccess(button);

      const openedNotification = openCartNotification(result);

      document.dispatchEvent(
        new CustomEvent('cart:updated', {
          bubbles: true,
          detail: {
            source: 'bojax-course-button',
            product: result
          }
        })
      );

      if (!openedNotification) {
        window.setTimeout(() => {
          window.location.href =
            `${window.Shopify.routes.root}cart`;
        }, 650);
      }
    } catch (error) {
      console.error('[Bojax add to cart]', error);

      setButtonLoading(button, false);
      showButtonError(button);
    } finally {
      window.setTimeout(() => {
        button.dataset.bojaxAdding = 'false';
      }, 500);
    }
  };

  const isCourseButton = (element) => {
    if (!(element instanceof Element)) {
      return false;
    }

    const button = element.closest(BUTTON_SELECTOR);

    if (!button) {
      return false;
    }

    /*
     * Product forms in the hero and pricing section already work through
     * Dawn's product-form.js, so this script leaves those buttons alone.
     */
    if (button.closest('product-form')) {
      return false;
    }

    return button;
  };

  document.addEventListener('click', (event) => {
    const button = isCourseButton(event.target);

    if (!button) {
      return;
    }

    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    addCourseToCart(button);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    const button = isCourseButton(event.target);

    if (!button || button.tagName === 'A') {
      return;
    }

    event.preventDefault();
    addCourseToCart(button);
  });
})();
