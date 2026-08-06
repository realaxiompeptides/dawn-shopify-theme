(() => {
  const COURSE_HANDLE =
    'bojax-course';

  const COURSE_URL =
    `/products/${COURSE_HANDLE}`;

  const BUTTON_SELECTOR = [
    '[data-bojax-course-add]',
    '.bojax-course-add-button',
    '.bojax-curriculum__button',
    '.bojax-transformations__button',
    `a[href*="${COURSE_URL}"]`
  ].join(',');

  let cachedVariantId = null;
  let variantRequest = null;
  let requestRunning = false;

  const getRoot = () => {
    return (
      window.Shopify?.routes?.root ||
      '/'
    );
  };

  const saveButtonHTML = (button) => {
    if (
      !button.dataset.bojaxOriginalHtml
    ) {
      button.dataset.bojaxOriginalHtml =
        button.innerHTML;
    }
  };

  const restoreButton = (button) => {
    if (
      button.dataset.bojaxOriginalHtml
    ) {
      button.innerHTML =
        button.dataset.bojaxOriginalHtml;
    }

    button.classList.remove(
      'is-loading'
    );

    button.removeAttribute(
      'aria-busy'
    );

    button.removeAttribute(
      'aria-disabled'
    );

    button.style.pointerEvents = '';
  };

  const setLoading = (button) => {
    saveButtonHTML(button);

    button.classList.add(
      'is-loading'
    );

    button.setAttribute(
      'aria-busy',
      'true'
    );

    button.setAttribute(
      'aria-disabled',
      'true'
    );

    button.style.pointerEvents =
      'none';

    button.innerHTML = `
      <span class="bojax-course-add-button__loading">
        <span
          class="bojax-course-add-button__spinner"
          aria-hidden="true"
        ></span>

        <span>Adding to cart</span>
      </span>
    `;
  };

  const showSuccess = (button) => {
    restoreButton(button);
    saveButtonHTML(button);

    button.innerHTML = `
      <span class="bojax-course-add-button__success">
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
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
      restoreButton(button);
    }, 1500);
  };

  const showError = (
    button,
    error
  ) => {
    console.error(
      '[Bojax cart]',
      error
    );

    restoreButton(button);
    saveButtonHTML(button);

    button.innerHTML = `
      <span class="bojax-course-add-button__error">
        Try again
      </span>
    `;

    window.setTimeout(() => {
      restoreButton(button);
    }, 2200);
  };

  const getVariantId = async () => {
    if (cachedVariantId) {
      return cachedVariantId;
    }

    if (variantRequest) {
      return variantRequest;
    }

    const productURL =
      `${getRoot()}products/` +
      `${COURSE_HANDLE}.js`;

    variantRequest =
      fetch(productURL, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `Product request failed: ${response.status}`
            );
          }

          return response.json();
        })
        .then((product) => {
          const variant =
            product.variants?.find(
              (item) => item.available
            ) ||
            product.variants?.[0];

          if (!variant) {
            throw new Error(
              'No course variant found.'
            );
          }

          cachedVariantId =
            variant.id;

          return cachedVariantId;
        })
        .finally(() => {
          variantRequest = null;
        });

    return variantRequest;
  };

  const getDrawer = () => {
    return document.querySelector(
      'cart-drawer'
    );
  };

  const getSectionIds = () => {
    const drawer = getDrawer();

    if (
      drawer &&
      typeof drawer.getSectionsToRender ===
        'function'
    ) {
      return drawer
        .getSectionsToRender()
        .map((section) => section.id);
    }

    return [
      'cart-drawer',
      'cart-icon-bubble'
    ];
  };

  const openDrawer = (result) => {
    const drawer = getDrawer();

    if (!drawer) {
      console.error(
        '[Bojax cart] cart-drawer was not found.'
      );

      return false;
    }

    if (
      typeof drawer.renderContents ===
        'function'
    ) {
      drawer.renderContents(result);
    } else if (
      typeof drawer.open === 'function'
    ) {
      drawer.open();
    } else {
      drawer.classList.add(
        'animate',
        'active'
      );

      document.body.classList.add(
        'overflow-hidden'
      );
    }

    return true;
  };

  const addCourse = async (
    button
  ) => {
    if (
      requestRunning ||
      button.dataset.bojaxAdding ===
        'true'
    ) {
      return;
    }

    requestRunning = true;

    button.dataset.bojaxAdding =
      'true';

    setLoading(button);

    try {
      const variantId =
        await getVariantId();

      const sections =
        getSectionIds();

      const formData =
        new FormData();

      formData.append(
        'id',
        String(variantId)
      );

      formData.append(
        'quantity',
        '1'
      );

      formData.append(
        'sections',
        sections.join(',')
      );

      formData.append(
        'sections_url',
        window.location.pathname +
          window.location.search
      );

      const response =
        await fetch(
          `${getRoot()}cart/add.js`,
          {
            method: 'POST',
            headers: {
              Accept:
                'application/json',
              'X-Requested-With':
                'XMLHttpRequest'
            },
            body: formData
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        result.status
      ) {
        throw new Error(
          result.description ||
          result.message ||
          'Unable to add course.'
        );
      }

      showSuccess(button);

      window.BojaxCartReservationTimer
        ?.start();

      const opened =
        openDrawer(result);

      document.dispatchEvent(
        new CustomEvent(
          'cart:updated',
          {
            bubbles: true,
            detail: {
              source:
                'bojax-course-button',
              product: result
            }
          }
        )
      );

      if (!opened) {
        window.location.href =
          `${getRoot()}cart`;
      }
    } catch (error) {
      showError(button, error);
    } finally {
      window.setTimeout(() => {
        requestRunning = false;

        button.dataset.bojaxAdding =
          'false';
      }, 500);
    }
  };

  const findButton = (target) => {
    if (
      !(target instanceof Element)
    ) {
      return null;
    }

    return target.closest(
      BUTTON_SELECTOR
    );
  };

  document.addEventListener(
    'click',
    (event) => {
      const button =
        findButton(event.target);

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

      addCourse(button);
    },
    true
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key !== 'Enter' &&
        event.key !== ' '
      ) {
        return;
      }

      const button =
        findButton(event.target);

      if (!button) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      addCourse(button);
    },
    true
  );

  console.log(
    '[Bojax cart] Add-to-cart script loaded.'
  );
})();
