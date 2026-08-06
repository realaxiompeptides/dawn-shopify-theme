(() => {
  const COURSE_HANDLE = 'bojax-course';
  const COURSE_URL_PART = `/products/${COURSE_HANDLE}`;

  /*
   * These are the Bojax buttons that should add the course and open
   * the actual right-side cart drawer.
   */
  const BUTTON_SELECTOR = [
    '[data-bojax-course-add]',
    `a[href*="${COURSE_URL_PART}"]`,
    '.bojax-course-add-button',
    '.bojax-curriculum__button',
    '.bojax-transformations__button'
  ].join(',');

  let cachedVariantId = null;
  let variantRequest = null;
  let addRequestRunning = false;

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
          throw new Error(
            'The Bojax Course product could not be loaded.'
          );
        }

        return response.json();
      })
      .then((product) => {
        const availableVariant =
          product.variants.find((variant) => variant.available) ||
          product.variants[0];

        if (!availableVariant) {
          throw new Error('No course variant was found.');
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
        [
          '.bojax-course-add-button__text',
          '.bojax-curriculum__button-text',
          '.bojax-transformations__button-text'
        ].join(',')
      ) || button
    );
  };

  const saveOriginalButtonContent = (button) => {
    if (!button.dataset.bojaxOriginalHtml) {
      button.dataset.bojaxOriginalHtml = button.innerHTML;
    }
  };

  const restoreButtonContent = (button) => {
    if (button.dataset.bojaxOriginalHtml) {
      button.innerHTML = button.dataset.bojaxOriginalHtml;
    }
  };

  const setButtonLoading = (button, loading) => {
    saveOriginalButtonContent(button);

    const textElement = getButtonTextElement(button);

    if (loading) {
      button.classList.add('is-loading');
      button.setAttribute('aria-busy', 'true');
      button.setAttribute('aria-disabled', 'true');
      button.style.pointerEvents = 'none';

      if (textElement === button) {
        button.innerHTML = `
          <span class="bojax-course-add-button__loading">
            <span
              class="bojax-course-add-button__spinner"
              aria-hidden="true"
            ></span>

            <span>Adding to cart</span>
          </span>
        `;
      } else {
        textElement.textContent = 'Adding to cart';
      }

      return;
    }

    button.classList.remove('is-loading');
    button.removeAttribute('aria-busy');
    button.removeAttribute('aria-disabled');
    button.style.pointerEvents = '';

    restoreButtonContent(button);
  };

  const showButtonSuccess = (button) => {
    saveOriginalButtonContent(button);

    button.innerHTML = `
      <span class="bojax-course-add-button__success">
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M5 10.5 8.2 13.7 15.5 6.2"
            fill="none"
            stroke="currentColor"
            stroke-width="2.3"
            stroke-linecap="round"
            stroke-linejoin="round"
          ></path>
        </svg>

        <span>Added to cart</span>
      </span>
    `;

    window.setTimeout(() => {
      restoreButtonContent(button);
    }, 1600);
  };

  const showButtonError = (button) => {
    saveOriginalButtonContent(button);

    button.innerHTML = `
      <span class="bojax-course-add-button__error">
        Could not add to cart
      </span>
    `;

    window.setTimeout(() => {
      restoreButtonContent(button);
    }, 2200);
  };

  /*
   * Only use the actual Dawn cart drawer.
   * The old cart notification is intentionally not used.
   */
  const getCartDrawer = () => {
    return document.querySelector('cart-drawer');
  };

  const getCartSections = () => {
    const cartDrawer = getCartDrawer();

    if (
      cartDrawer &&
      typeof cartDrawer.getSectionsToRender === 'function'
    ) {
      return cartDrawer
        .getSectionsToRender()
        .map((section) => section.id);
    }

    /*
     * Dawn cart-drawer fallback section IDs.
     */
    return [
      'cart-drawer',
      'cart-icon-bubble'
    ];
  };

  const openCartDrawer = (cartResponse) => {
    const cartDrawer = getCartDrawer();

    if (!cartDrawer) {
      console.error(
        '[Bojax cart] No <cart-drawer> element was found. ' +
        'Make sure the theme cart type is set to drawer.'
      );

      return false;
    }

    /*
     * Dawn normally renders the returned section HTML and then opens
     * the drawer through renderContents().
     */
    if (typeof cartDrawer.renderContents === 'function') {
      cartDrawer.renderContents(cartResponse);

      window.setTimeout(() => {
        if (typeof cartDrawer.open === 'function') {
          cartDrawer.open();
        }
      }, 50);

      return true;
    }

    /*
     * Fallback opening behavior in case the theme has a customized
     * cart drawer class without renderContents().
     */
    if (typeof cartDrawer.open === 'function') {
      cartDrawer.open();
      return true;
    }

    cartDrawer.classList.add('active', 'animate');
    document.body.classList.add('overflow-hidden');

    return true;
  };

  const addCourseToCart = async (button) => {
    if (
      addRequestRunning ||
      button.dataset.bojaxAdding === 'true'
    ) {
      return;
    }

    addRequestRunning = true;
    button.dataset.bojaxAdding = 'true';

    setButtonLoading(button, true);

    try {
      const variantId = await getCourseVariantId();
      const sections = getCartSections();

      const formData = new FormData();

      formData.append('id', String(variantId));
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
          'The course could not be added to your cart.'
        );
      }

      setButtonLoading(button, false);
      showButtonSuccess(button);

      const drawerOpened = openCartDrawer(result);

      document.dispatchEvent(
        new CustomEvent('cart:updated', {
          bubbles: true,
          detail: {
            source: 'bojax-course-button',
            product: result
          }
        })
      );

      /*
       * Never open the old notification.
       * If the cart drawer is missing, send the customer to the cart page.
       */
      if (!drawerOpened) {
        window.setTimeout(() => {
          window.location.href =
            `${window.Shopify.routes.root}cart`;
        }, 500);
      }
    } catch (error) {
      console.error('[Bojax add to cart]', error);

      setButtonLoading(button, false);
      showButtonError(button);
    } finally {
      window.setTimeout(() => {
        button.dataset.bojaxAdding = 'false';
        addRequestRunning = false;
      }, 500);
    }
  };

  const findCourseButton = (target) => {
    if (!(target instanceof Element)) {
      return null;
    }

    return target.closest(BUTTON_SELECTOR);
  };

  /*
   * Capture mode is important. It allows this script to stop Dawn's
   * product-form.js before it opens the old cart notification.
   */
  document.addEventListener(
    'click',
    (event) => {
      const button = findCourseButton(event.target);

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
      event.stopPropagation();
      event.stopImmediatePropagation();

      addCourseToCart(button);
    },
    true
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }

      const button = findCourseButton(event.target);

      if (!button || button.tagName === 'A') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      addCourseToCart(button);
    },
    true
  );
})();
