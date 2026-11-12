(function () {
  function initializeCarousel(carousel) {
    var viewport = carousel.querySelector('[data-testimonials-viewport]');
    var track = carousel.querySelector('[data-testimonials-track]');
    var cards = Array.prototype.slice.call(carousel.querySelectorAll('[data-testimonial-card]'));
    var controls = carousel.querySelector('[data-testimonials-controls]');
    var previousButton = carousel.querySelector('[data-testimonials-previous]');
    var nextButton = carousel.querySelector('[data-testimonials-next]');
    var status = carousel.querySelector('[data-testimonials-status]');
    var updateFrame;
    var dragPointerId = null;
    var dragStartX = 0;
    var dragStartScrollLeft = 0;

    if (!viewport || !track || !controls || !previousButton || !nextButton || !cards.length) {
      return;
    }

    carousel.classList.add('is-enhanced');

    function getStep() {
      var styles = window.getComputedStyle(track);
      var gap = parseFloat(styles.columnGap || styles.gap) || 0;

      return cards[0].getBoundingClientRect().width + gap;
    }

    function updateControls() {
      var maximumScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      var hasOverflow = maximumScroll > 2;
      var step = getStep();
      var currentIndex = step ? Math.round(viewport.scrollLeft / step) : 0;
      var visibleCount = step ? Math.max(1, Math.round((viewport.clientWidth + (step - cards[0].getBoundingClientRect().width)) / step)) : 1;
      var lastVisible = Math.min(cards.length, currentIndex + visibleCount);

      controls.hidden = !hasOverflow;
      previousButton.disabled = !hasOverflow || viewport.scrollLeft <= 2;
      nextButton.disabled = !hasOverflow || viewport.scrollLeft >= maximumScroll - 2;
      status.textContent = hasOverflow
        ? 'Showing testimonials ' + (currentIndex + 1) + ' through ' + lastVisible + ' of ' + cards.length
        : 'Showing all ' + cards.length + ' testimonials';
    }

    function requestControlUpdate() {
      window.cancelAnimationFrame(updateFrame);
      updateFrame = window.requestAnimationFrame(updateControls);
    }

    function move(direction) {
      viewport.scrollBy({
        left: direction * getStep(),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      });
    }

    previousButton.addEventListener('click', function () {
      move(-1);
    });

    nextButton.addEventListener('click', function () {
      move(1);
    });

    viewport.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        move(event.key === 'ArrowLeft' ? -1 : 1);
      }
    });

    viewport.addEventListener('scroll', requestControlUpdate, { passive: true });

    viewport.addEventListener('pointerdown', function (event) {
      if (event.pointerType !== 'mouse' || event.button !== 0) {
        return;
      }

      dragPointerId = event.pointerId;
      dragStartX = event.clientX;
      dragStartScrollLeft = viewport.scrollLeft;
      viewport.classList.add('is-dragging');
      viewport.setPointerCapture(dragPointerId);
    });

    viewport.addEventListener('pointermove', function (event) {
      if (event.pointerId !== dragPointerId) {
        return;
      }

      event.preventDefault();
      viewport.scrollLeft = dragStartScrollLeft - (event.clientX - dragStartX);
    });

    function endDrag(event) {
      if (event.pointerId !== dragPointerId) {
        return;
      }

      if (viewport.hasPointerCapture(dragPointerId)) {
        viewport.releasePointerCapture(dragPointerId);
      }

      dragPointerId = null;
      viewport.classList.remove('is-dragging');
      requestControlUpdate();
    }

    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    if ('ResizeObserver' in window) {
      new ResizeObserver(requestControlUpdate).observe(viewport);
    } else {
      window.addEventListener('resize', requestControlUpdate);
    }

    updateControls();
  }

  function initializeCarousels() {
    document.querySelectorAll('[data-testimonials-carousel]').forEach(initializeCarousel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCarousels);
  } else {
    initializeCarousels();
  }
})();
