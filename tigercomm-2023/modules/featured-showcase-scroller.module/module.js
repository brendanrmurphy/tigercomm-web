(function () {
  const DEFAULT_SPEED = 80;
  const SPEED_SCALE = 4;
  let observerStarted = false;
  let initFrame = null;

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
    let isPointerActive = false;
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

      if (listWidth) {
        const prepareDuplicateList = (list) => {
          list.setAttribute("aria-hidden", "true");
          list.querySelectorAll("a, button, input, select, textarea").forEach((element) => {
            element.setAttribute("tabindex", "-1");
          });
        };
        const requiredCopies = Math.max(2, Math.ceil(viewport.clientWidth / listWidth) + 2);

        Array.from(track.children).slice(1).forEach(prepareDuplicateList);
        while (track.children.length < requiredCopies) {
          const duplicateList = firstList.cloneNode(true);

          prepareDuplicateList(duplicateList);
          track.appendChild(duplicateList);
        }
      }

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

      resetDragState();
      pointerId = event.pointerId;
      isPointerActive = true;
      isDragging = false;
      didDrag = false;
      dragStartX = event.clientX;
      dragStartOffset = offset;
    };

    const onPointerMove = (event) => {
      if (!isPointerActive || event.pointerId !== pointerId) {
        return;
      }

      const dragDistance = event.clientX - dragStartX;

      if (!isDragging && Math.abs(dragDistance) > 8) {
        isDragging = true;
        didDrag = true;
        scroller.classList.add("is-dragging");
        if (viewport.setPointerCapture) {
          try {
            viewport.setPointerCapture(pointerId);
          } catch (error) {
            // Pointer capture can fail if the browser has already canceled the pointer.
          }
        }
      }

      if (!isDragging) {
        return;
      }

      offset = normalizeOffset(dragStartOffset + dragDistance, listWidth);
      track.style.transform = `translate3d(${offset}px, 0, 0)`;
    };

    const resetDragState = () => {
      const activePointerId = pointerId;

      isPointerActive = false;
      isDragging = false;
      pointerId = null;
      scroller.classList.remove("is-dragging");

      if (activePointerId !== null && viewport.hasPointerCapture && viewport.hasPointerCapture(activePointerId)) {
        try {
          viewport.releasePointerCapture(activePointerId);
        } catch (error) {
          // The pointer may already be released after a cancel, blur, or leave event.
        }
      }
    };

    const endDrag = (event) => {
      if (!isPointerActive || (event && event.pointerId !== pointerId)) {
        return;
      }

      resetDragState();
    };

    const onDocumentPointerMove = (event) => {
      if (!isPointerActive || event.pointerId !== pointerId) {
        return;
      }

      const bounds = viewport.getBoundingClientRect();
      const isOutside =
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom;

      if (isOutside) {
        resetDragState();
      }
    };

    const onNativeDragStart = (event) => {
      if (event.target.closest("img, .featured-showcase-card")) {
        event.preventDefault();
      }
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
    viewport.addEventListener("pointerleave", endDrag);
    viewport.addEventListener("dragstart", onNativeDragStart);
    viewport.addEventListener("click", onClick, true);
    viewport.addEventListener("mouseenter", () => {
      isHovering = true;
    });
    viewport.addEventListener("mouseleave", () => {
      isHovering = false;
      endDrag();
    });
    document.addEventListener("pointerup", endDrag);
    document.addEventListener("pointercancel", endDrag);
    document.addEventListener("pointermove", onDocumentPointerMove);
    window.addEventListener("blur", resetDragState);

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

  const scheduleInit = () => {
    if (initFrame) {
      return;
    }

    initFrame = window.requestAnimationFrame(() => {
      initFrame = null;
      init();
    });
  };

  const watchForEditorUpdates = () => {
    if (observerStarted || !window.MutationObserver || !document.body) {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      const hasNewScroller = mutations.some((mutation) => {
        return Array.from(mutation.addedNodes).some((node) => {
          return node.nodeType === 1 && (
            node.matches("[data-featured-showcase-scroller]") ||
            node.querySelector("[data-featured-showcase-scroller]")
          );
        });
      });

      if (hasNewScroller) {
        scheduleInit();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    observerStarted = true;
  };

  const boot = () => {
    init();
    watchForEditorUpdates();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
}());
