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
      viewport.classList.add('is-dragging');
      viewport.setPointerCapture(pointerId);
    });

    function endPointerInteraction(event) {
      if (event.pointerId !== pointerId) {
        return;
      }

      var distance = event.clientX - pointerStartX;

      if (viewport.hasPointerCapture(pointerId)) {
        viewport.releasePointerCapture(pointerId);
      }

      pointerId = null;
      viewport.classList.remove('is-dragging');

      if (Math.abs(distance) >= 50) {
        move(distance > 0 ? -1 : 1);
      }
    }

    function cancelPointerInteraction(event) {
      if (event.pointerId !== pointerId) {
        return;
      }

      pointerId = null;
      viewport.classList.remove('is-dragging');
    }

    viewport.addEventListener('pointerup', endPointerInteraction);
    viewport.addEventListener('pointercancel', cancelPointerInteraction);
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
