(function () {
  const DEFAULT_SPEED = 80;
  const SPEED_SCALE = 4;

  const getSpeed = (scroller) => {
    const value = getComputedStyle(scroller).getPropertyValue("--showcase-scroll-speed");
    const speed = parseFloat(value);
    const normalizedSpeed = Number.isFinite(speed) && speed >= 0 ? speed : DEFAULT_SPEED;

    return normalizedSpeed / SPEED_SCALE;
  };

  const normalizeOffset = (offset, width) => {
    if (!width) {
      return offset;
    }

    let nextOffset = offset % width;

    if (nextOffset > 0) {
      nextOffset -= width;
    }

    return nextOffset;
  };

  const initScroller = (scroller) => {
    if (scroller.dataset.featuredShowcaseScrollerInitialized === "true") {
      return;
    }

    const viewport = scroller.querySelector("[data-featured-showcase-viewport]");
    const track = scroller.querySelector("[data-featured-showcase-track]");
    const firstList = track ? track.querySelector(".featured-showcase-scroller__list") : null;
    const pauseButton = scroller.querySelector("[data-featured-showcase-pause]");
    const previousButton = scroller.querySelector("[data-featured-showcase-prev]");
    const nextButton = scroller.querySelector("[data-featured-showcase-next]");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isStaticScroller = scroller.classList.contains("featured-showcase-scroller--static");

    if (!viewport || !track || !firstList) {
      return;
    }

    let listWidth = 0;
    let offset = 0;
    let lastFrame = 0;
    let isDragging = false;
    let isHovering = false;
    let isPaused = false;
    let didDrag = false;
    let pointerId = null;
    let dragStartX = 0;
    let dragStartOffset = 0;
    const direction = scroller.classList.contains("featured-showcase-scroller--reverse") ? 1 : -1;

    const equalizeCards = () => {
      const cards = Array.from(scroller.querySelectorAll(".featured-showcase-card"));

      if (!cards.length) {
        return;
      }

      scroller.style.setProperty("--showcase-card-height", "auto");
      track.getBoundingClientRect();

      const tallestCard = cards.reduce((height, card) => {
        return Math.max(height, Math.ceil(card.getBoundingClientRect().height));
      }, 0);

      if (tallestCard) {
        scroller.style.setProperty("--showcase-card-height", `${tallestCard}px`);
      }
    };

    if (isStaticScroller) {
      scroller.dataset.featuredShowcaseScrollerInitialized = "true";
      scroller.classList.add("is-enhanced");
      return;
    }

    const measure = () => {
      const trackStyles = getComputedStyle(track);
      const trackGap = parseFloat(trackStyles.columnGap || trackStyles.gap) || 0;

      equalizeCards();
      listWidth = firstList.getBoundingClientRect().width + trackGap;
      offset = normalizeOffset(offset, listWidth);
      track.style.transform = `translate3d(${offset}px, 0, 0)`;
    };

    const getStepDistance = () => {
      const firstItem = firstList.querySelector(".featured-showcase-scroller__item");
      const listStyles = getComputedStyle(firstList);
      const listGap = parseFloat(listStyles.columnGap || listStyles.gap) || 0;
      const itemWidth = firstItem ? firstItem.getBoundingClientRect().width : 0;

      return itemWidth + listGap || Math.max(viewport.getBoundingClientRect().width * 0.8, 1);
    };

    const updatePauseButton = () => {
      if (!pauseButton) {
        return;
      }

      pauseButton.setAttribute("aria-pressed", isPaused ? "true" : "false");
      pauseButton.setAttribute("aria-label", isPaused ? "Resume scroller" : "Pause scroller");
      scroller.classList.toggle("is-paused", isPaused);
    };

    const moveBy = (distance) => {
      if (!listWidth) {
        measure();
      }

      if (!listWidth) {
        return;
      }

      offset = normalizeOffset(offset + distance, listWidth);
      track.style.transform = `translate3d(${offset}px, 0, 0)`;
      lastFrame = 0;
    };

    const tick = (timestamp) => {
      if (!document.documentElement.contains(scroller)) {
        return;
      }

      if (!lastFrame) {
        lastFrame = timestamp;
      }

      const elapsed = (timestamp - lastFrame) / 1000;
      lastFrame = timestamp;

      if (!reduceMotion.matches && !isDragging && !isHovering && !isPaused && listWidth) {
        const speed = getSpeed(scroller);

        offset = normalizeOffset(offset + direction * speed * elapsed, listWidth);
        track.style.transform = `translate3d(${offset}px, 0, 0)`;
      }

      window.requestAnimationFrame(tick);
    };

    const onPointerDown = (event) => {
      if (event.button !== undefined && event.button !== 0) {
        return;
      }

      pointerId = event.pointerId;
      isDragging = true;
      didDrag = false;
      dragStartX = event.clientX;
      dragStartOffset = offset;
      scroller.classList.add("is-dragging");
      viewport.setPointerCapture(pointerId);
    };

    const onPointerMove = (event) => {
      if (!isDragging || event.pointerId !== pointerId) {
        return;
      }

      offset = normalizeOffset(dragStartOffset + event.clientX - dragStartX, listWidth);
      didDrag = didDrag || Math.abs(event.clientX - dragStartX) > 10;
      track.style.transform = `translate3d(${offset}px, 0, 0)`;
    };

    const endDrag = (event) => {
      if (!isDragging || event.pointerId !== pointerId) {
        return;
      }

      isDragging = false;
      scroller.classList.remove("is-dragging");

      if (viewport.hasPointerCapture(pointerId)) {
        viewport.releasePointerCapture(pointerId);
      }

      pointerId = null;
    };

    const onClick = (event) => {
      if (!didDrag) {
        return;
      }

      event.preventDefault();
      didDrag = false;
    };

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);
    viewport.addEventListener("click", onClick, true);
    viewport.addEventListener("mouseenter", () => {
      isHovering = true;
    });
    viewport.addEventListener("mouseleave", () => {
      isHovering = false;
    });

    if (pauseButton) {
      pauseButton.addEventListener("click", () => {
        isPaused = !isPaused;
        lastFrame = 0;
        updatePauseButton();
      });
    }

    if (previousButton) {
      previousButton.addEventListener("click", () => {
        moveBy(-direction * getStepDistance());
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", () => {
        moveBy(direction * getStepDistance());
      });
    }

    window.addEventListener("resize", measure);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measure);
    }

    scroller.querySelectorAll("img").forEach((image) => {
      if (!image.complete) {
        image.addEventListener("load", measure, { once: true });
        image.addEventListener("error", measure, { once: true });
      }
    });

    scroller.dataset.featuredShowcaseScrollerInitialized = "true";
    scroller.classList.add("is-enhanced");
    updatePauseButton();
    measure();
    window.requestAnimationFrame(tick);
  };

  const init = () => {
    const scrollers = document.querySelectorAll("[data-featured-showcase-scroller]");

    scrollers.forEach(initScroller);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}());
