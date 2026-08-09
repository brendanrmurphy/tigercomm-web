(function () {
  var initializationScheduled = false;

  function initializeScroller(scroller) {
    if (scroller.dataset.dynamicContentScrollerInitialized === "true") {
      return;
    }

    var viewport = scroller.querySelector("[data-dynamic-content-viewport]");
    var track = scroller.querySelector("[data-dynamic-content-track]");
    var firstList = track && track.querySelector(".dynamic-content-scroller__list");
    var previousButton = scroller.querySelector("[data-dynamic-content-previous]");
    var nextButton = scroller.querySelector("[data-dynamic-content-next]");
    var pauseButton = scroller.querySelector("[data-dynamic-content-pause]");

    if (!viewport || !track || !firstList) {
      return;
    }

    var autoplay = scroller.dataset.autoplay === "true";
    var direction = scroller.dataset.direction === "right" ? 1 : -1;
    var configuredSpeed = parseFloat(scroller.dataset.speed);
    var speed = Number.isFinite(configuredSpeed) ? configuredSpeed : 30;
    var pauseOnInteraction = scroller.classList.contains("dynamic-content-scroller--pause-on-interaction");
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var listWidth = 0;
    var offset = 0;
    var lastFrame = 0;
    var isPaused = false;
    var isHovering = false;
    var isFocusing = false;
    var isPointerActive = false;
    var isDragging = false;
    var didDrag = false;
    var pointerId = null;
    var dragStartX = 0;
    var dragStartOffset = 0;

    function normalizeOffset(value) {
      if (!listWidth) return value;
      var normalized = value % listWidth;
      return normalized > 0 ? normalized - listWidth : normalized;
    }

    function prepareDuplicate(list) {
      list.setAttribute("aria-hidden", "true");
      list.querySelectorAll("a, button, input, select, textarea").forEach(function (element) {
        element.setAttribute("tabindex", "-1");
      });
    }

    function equalizeCards() {
      var cards = Array.prototype.slice.call(firstList.querySelectorAll(".dynamic-content-card"));
      var tallest = 0;

      cards.forEach(function (card) { card.style.minHeight = "0"; });
      cards.forEach(function (card) { tallest = Math.max(tallest, Math.ceil(card.getBoundingClientRect().height)); });
      if (tallest) cards.forEach(function (card) { card.style.minHeight = tallest + "px"; });
    }

    function measure() {
      var trackStyles = window.getComputedStyle(track);
      var trackGap = parseFloat(trackStyles.columnGap || trackStyles.gap) || 0;

      equalizeCards();
      listWidth = firstList.getBoundingClientRect().width + trackGap;
      if (listWidth && !scroller.classList.contains("dynamic-content-scroller--static")) {
        var requiredCopies = Math.max(2, Math.ceil(viewport.clientWidth / listWidth) + 2);
        Array.prototype.slice.call(track.children, 1).forEach(prepareDuplicate);
        while (track.children.length < requiredCopies) {
          var duplicate = firstList.cloneNode(true);
          prepareDuplicate(duplicate);
          track.appendChild(duplicate);
        }
      }
      offset = normalizeOffset(offset);
      track.style.transform = "translate3d(" + offset + "px, 0, 0)";
    }

    function stepDistance() {
      var item = firstList.querySelector(".dynamic-content-scroller__item");
      var styles = window.getComputedStyle(firstList);
      return (item ? item.getBoundingClientRect().width : viewport.clientWidth * 0.8) + (parseFloat(styles.gap) || 0);
    }

    function moveBy(distance) {
      offset = normalizeOffset(offset + distance);
      track.style.transform = "translate3d(" + offset + "px, 0, 0)";
      lastFrame = 0;
    }

    function updatePauseButton() {
      if (!pauseButton) return;
      pauseButton.setAttribute("aria-pressed", isPaused ? "true" : "false");
      pauseButton.setAttribute("aria-label", isPaused ? "Resume scroller" : "Pause scroller");
      scroller.classList.toggle("is-paused", isPaused);
    }

    function tick(timestamp) {
      if (!document.documentElement.contains(scroller)) return;
      if (!lastFrame) lastFrame = timestamp;
      var elapsed = (timestamp - lastFrame) / 1000;
      lastFrame = timestamp;
      var interactionPaused = pauseOnInteraction && (isHovering || isFocusing);

      if (autoplay && !reduceMotion.matches && !isPaused && !interactionPaused && !isDragging && listWidth) {
        offset = normalizeOffset(offset + direction * speed * elapsed);
        track.style.transform = "translate3d(" + offset + "px, 0, 0)";
      }
      window.requestAnimationFrame(tick);
    }

    function resetPointer() {
      var activePointer = pointerId;
      isPointerActive = false;
      isDragging = false;
      pointerId = null;
      scroller.classList.remove("is-dragging");
      if (activePointer !== null && viewport.hasPointerCapture && viewport.hasPointerCapture(activePointer)) {
        try { viewport.releasePointerCapture(activePointer); } catch (error) { /* Pointer already released. */ }
      }
    }

    viewport.addEventListener("pointerdown", function (event) {
      if (event.button !== undefined && event.button !== 0) return;
      pointerId = event.pointerId;
      isPointerActive = true;
      isDragging = false;
      didDrag = false;
      dragStartX = event.clientX;
      dragStartOffset = offset;
    });

    viewport.addEventListener("pointermove", function (event) {
      if (!isPointerActive || event.pointerId !== pointerId) return;
      var distance = event.clientX - dragStartX;
      if (!isDragging && Math.abs(distance) > 8) {
        isDragging = true;
        didDrag = true;
        scroller.classList.add("is-dragging");
        if (viewport.setPointerCapture) {
          try { viewport.setPointerCapture(pointerId); } catch (error) { /* Capture is optional. */ }
        }
      }
      if (isDragging) {
        offset = normalizeOffset(dragStartOffset + distance);
        track.style.transform = "translate3d(" + offset + "px, 0, 0)";
      }
    });

    function endPointer(event) {
      if (!isPointerActive || (event && event.pointerId !== pointerId)) return;
      resetPointer();
    }

    viewport.addEventListener("pointerup", endPointer);
    viewport.addEventListener("pointercancel", endPointer);
    viewport.addEventListener("pointerleave", endPointer);
    viewport.addEventListener("dragstart", function (event) { event.preventDefault(); });
    viewport.addEventListener("click", function (event) {
      if (didDrag) {
        event.preventDefault();
        didDrag = false;
      }
    }, true);
    viewport.addEventListener("mouseenter", function () { isHovering = true; });
    viewport.addEventListener("mouseleave", function () { isHovering = false; });
    viewport.addEventListener("focusin", function () { isFocusing = true; });
    viewport.addEventListener("focusout", function (event) { isFocusing = viewport.contains(event.relatedTarget); });

    if (previousButton) previousButton.addEventListener("click", function () { moveBy(-direction * stepDistance()); });
    if (nextButton) nextButton.addEventListener("click", function () { moveBy(direction * stepDistance()); });
    if (pauseButton) pauseButton.addEventListener("click", function () {
      isPaused = !isPaused;
      lastFrame = 0;
      updatePauseButton();
    });

    window.addEventListener("resize", measure);
    scroller.querySelectorAll("img").forEach(function (image) {
      if (!image.complete) image.addEventListener("load", measure, { once: true });
    });

    scroller.dataset.dynamicContentScrollerInitialized = "true";
    updatePauseButton();
    measure();
    window.requestAnimationFrame(tick);
  }

  function initializeAll() {
    document.querySelectorAll("[data-dynamic-content-scroller]").forEach(initializeScroller);
  }

  function scheduleInitialization() {
    if (initializationScheduled) return;
    initializationScheduled = true;
    window.requestAnimationFrame(function () {
      initializationScheduled = false;
      initializeAll();
    });
  }

  function boot() {
    initializeAll();
    if (window.MutationObserver && document.body) {
      var observer = new MutationObserver(scheduleInitialization);
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
}());
