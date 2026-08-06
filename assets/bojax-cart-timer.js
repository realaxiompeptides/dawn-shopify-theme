(() => {
  'use strict';

  const STORAGE_KEY = 'bojax_cart_reservation_expires_at';
  const TIMER_SELECTOR = '[data-bojax-cart-timer]';
  const RESERVATION_LENGTH_MS = 15 * 60 * 1000;

  let timerInterval = null;

  const safelyReadExpiry = () => {
    try {
      const storedValue = window.localStorage.getItem(STORAGE_KEY);
      const expiry = Number(storedValue);

      return Number.isFinite(expiry) ? expiry : 0;
    } catch (error) {
      return 0;
    }
  };

  const safelySaveExpiry = (expiry) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(expiry));
    } catch (error) {
      // The timer still works for the current page if storage is blocked.
    }
  };

  const createNewExpiry = () => {
    const expiry = Date.now() + RESERVATION_LENGTH_MS;

    safelySaveExpiry(expiry);

    return expiry;
  };

  const getActiveExpiry = () => {
    const storedExpiry = safelyReadExpiry();

    if (storedExpiry > Date.now()) {
      return storedExpiry;
    }

    return createNewExpiry();
  };

  const formatRemainingTime = (remainingMilliseconds) => {
    const totalSeconds = Math.max(
      0,
      Math.ceil(remainingMilliseconds / 1000)
    );

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const updateTimer = () => {
    const timerElements = document.querySelectorAll(TIMER_SELECTOR);

    if (!timerElements.length) {
      return;
    }

    const expiry = getActiveExpiry();
    const remaining = Math.max(0, expiry - Date.now());
    const formattedTime = formatRemainingTime(remaining);

    timerElements.forEach((timerElement) => {
      timerElement.textContent = formattedTime;
      timerElement.setAttribute(
        'aria-label',
        `${formattedTime} remaining to complete checkout`
      );

      if (remaining <= 60 * 1000) {
        timerElement.classList.add('is-ending');
      } else {
        timerElement.classList.remove('is-ending');
      }

      if (remaining <= 0) {
        timerElement.textContent = '00:00';
        timerElement.classList.add('is-expired');
      } else {
        timerElement.classList.remove('is-expired');
      }
    });
  };

  const startTimer = () => {
    if (timerInterval) {
      window.clearInterval(timerInterval);
    }

    getActiveExpiry();
    updateTimer();

    timerInterval = window.setInterval(updateTimer, 1000);
  };

  const restartReservation = () => {
    createNewExpiry();
    updateTimer();
  };

  /*
   * Start when the page is ready.
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startTimer, {
      once: true
    });
  } else {
    startTimer();
  }

  /*
   * Update immediately when returning to the tab.
   */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateTimer();
    }
  });

  window.addEventListener('pageshow', updateTimer);

  /*
   * Restart the reservation when the custom Bojax cart event fires.
   */
  document.addEventListener('cart:updated', restartReservation);

  /*
   * Also update after Dawn redraws the cart drawer.
   */
  document.addEventListener('cartUpdate', updateTimer);

  /*
   * Make the controls available without modifying cart-drawer.js.
   */
  window.BojaxCartTimer = {
    start: startTimer,
    update: updateTimer,
    restart: restartReservation
  };
})();
