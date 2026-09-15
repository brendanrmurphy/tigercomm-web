(function () {
  function initializeCarousel(carousel) {
    if (carousel.dataset.successStoriesCarouselInitialized === 'true') {
      return;
    }
    carousel.dataset.successStoriesCarouselInitialized = 'true';

    var slides = Array.prototype.slice.call(carousel.querySelectorAll('[data-success-story-slide]'));
    var viewport = carousel.querySelector('[data-success-stories-viewport]');
    var previousButton = carousel.querySelector('[data-success-stories-previous]');
    var nextButton = carousel.querySelector('[data-success-stories-next]');
    var status = carousel.querySelector('[data-success-stories-status]');
    var activeIndex = 0;
    var pointerId = null;
    var pointerStartX = 0;
    var isDragging = false;
    var didDrag = false;

    if (!viewport || !slides.length) {
      return;
    }

    if (slides.length > 1) {
      for (var slideIndex = slides.length - 1; slideIndex > 0; slideIndex -= 1) {
        var randomIndex = Math.floor(Math.random() * (slideIndex + 1));
        var currentSlide = slides[slideIndex];

        slides[slideIndex] = slides[randomIndex];
        slides[randomIndex] = currentSlide;
      }

      slides.forEach(function (slide) {
        viewport.appendChild(slide);
      });
    }

    function showSlide(index) {
      activeIndex = (index + slides.length) % slides.length;

      slides.forEach(function (slide, slideIndex) {
        var isActive = slideIndex === activeIndex;
        slide.classList.toggle('is-active', isActive);
        slide.hidden = !isActive;
      });

      if (status) {
        status.textContent = 'Showing success story ' + (activeIndex + 1) + ' of ' + slides.length;
      }
    }

    function move(direction) {
      showSlide(activeIndex + direction);
    }

    if (previousButton) {
      previousButton.addEventListener('click', function () {
        move(-1);
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', function () {
        move(1);
      });
    }

    viewport.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        move(event.key === 'ArrowLeft' ? -1 : 1);
      }
    });

    viewport.addEventListener('pointerdown', function (event) {
      if (event.button !== undefined && event.button !== 0) {
        return;
      }

      pointerId = event.pointerId;
      pointerStartX = event.clientX;
      isDragging = false;
      didDrag = false;
    });

    viewport.addEventListener('pointermove', function (event) {
      if (event.pointerId !== pointerId) {
        return;
      }

      var distance = event.clientX - pointerStartX;

      if (!isDragging && Math.abs(distance) > 8) {
        isDragging = true;
        didDrag = true;
        viewport.classList.add('is-dragging');

        if (viewport.setPointerCapture) {
          try {
            viewport.setPointerCapture(pointerId);
          } catch (error) {
            /* Pointer capture is optional. */
          }
        }
      }
    });

    function endPointerInteraction(event) {
      if (event.pointerId !== pointerId) {
        return;
      }

      var distance = event.clientX - pointerStartX;
      var completedDrag = isDragging;

      if (viewport.hasPointerCapture && viewport.hasPointerCapture(pointerId)) {
        try {
          viewport.releasePointerCapture(pointerId);
        } catch (error) {
          /* Pointer may already be released. */
        }
      }

      pointerId = null;
      isDragging = false;
      viewport.classList.remove('is-dragging');

      if (completedDrag && Math.abs(distance) >= 50) {
        move(distance > 0 ? -1 : 1);
      }

      if (completedDrag) {
        window.setTimeout(function () {
          didDrag = false;
        }, 0);
      }
    }

    function cancelPointerInteraction(event) {
      if (event.pointerId !== pointerId) {
        return;
      }

      pointerId = null;
      isDragging = false;
      didDrag = false;
      viewport.classList.remove('is-dragging');
    }

    viewport.addEventListener('pointerup', endPointerInteraction);
    viewport.addEventListener('pointercancel', cancelPointerInteraction);
    viewport.addEventListener('dragstart', function (event) {
      event.preventDefault();
    });
    viewport.addEventListener('click', function (event) {
      if (!didDrag) {
        return;
      }

      event.preventDefault();
      didDrag = false;
    }, true);
    showSlide(0);
  }

  function initializeCarousels() {
    document.querySelectorAll('[data-success-stories-carousel]').forEach(initializeCarousel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCarousels);
  } else {
    initializeCarousels();
  }
})();
