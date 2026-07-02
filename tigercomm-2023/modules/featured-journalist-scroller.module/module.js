(function () {
  const DEFAULT_DURATION = 140;
  const DEFAULT_SPEED = 40;

  const getDuration = (scroller) => {
    const value = getComputedStyle(scroller).getPropertyValue("--journalist-scroll-duration");
    const seconds = parseFloat(value);

    return Number.isFinite(seconds) && seconds > 0 ? seconds : DEFAULT_DURATION;
  };

  const getSpeed = (scroller) => {
    return DEFAULT_SPEED * (DEFAULT_DURATION / getDuration(scroller));
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
    if (scroller.dataset.featuredJournalistScrollerInitialized === "true") {
      return;
    }

    const viewport = scroller.querySelector("[data-featured-journalist-viewport]");
    const track = scroller.querySelector("[data-featured-journalist-track]");
    const firstList = track ? track.querySelector(".featured-journalist-scroller__list") : null;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isStaticScroller = scroller.classList.contains("featured-journalist-scroller--static");

    if (!viewport || !track || !firstList) {
      return;
    }

    let listWidth = 0;
    let offset = 0;
    let lastFrame = 0;
    let isDragging = false;
    let isHovering = false;
    let didDrag = false;
    let pointerId = null;
    let dragStartX = 0;
    let dragStartOffset = 0;
    const direction = scroller.classList.contains("featured-journalist-scroller--reverse") ? 1 : -1;

    const equalizeCards = () => {
      const cards = Array.from(scroller.querySelectorAll(".featured-journalist-card"));

      if (!cards.length) {
        return;
      }

      scroller.style.setProperty("--journalist-card-height", "auto");
      track.getBoundingClientRect();

      const tallestCard = cards.reduce((height, card) => {
        return Math.max(height, Math.ceil(card.getBoundingClientRect().height));
      }, 0);

      if (tallestCard) {
        scroller.style.setProperty("--journalist-card-height", `${tallestCard}px`);
      }
    };

    if (isStaticScroller) {
      scroller.dataset.featuredJournalistScrollerInitialized = "true";
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

    const tick = (timestamp) => {
      if (!document.documentElement.contains(scroller)) {
        return;
      }

      if (!lastFrame) {
        lastFrame = timestamp;
      }

      const elapsed = (timestamp - lastFrame) / 1000;
      lastFrame = timestamp;

      if (!reduceMotion.matches && !isDragging && !isHovering && listWidth) {
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

      if (event.target.closest("a")) {
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

    scroller.dataset.featuredJournalistScrollerInitialized = "true";
    scroller.classList.add("is-enhanced");
    measure();
    window.requestAnimationFrame(tick);
  };

  const init = () => {
    const scrollers = document.querySelectorAll("[data-featured-journalist-scroller]");

    scrollers.forEach(initScroller);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}());
