(function () {
  var initializationScheduled = false;

  function initializeServiceTiles(group) {
    if (group.dataset.interactiveServiceTilesInitialized === "true") {
      return;
    }

    var tiles = Array.prototype.slice.call(group.querySelectorAll("[data-service-tile]"));

    if (!tiles.length) {
      return;
    }

    function activate(tile) {
      tiles.forEach(function (item) {
        item.classList.toggle("is-active", item === tile);
      });
    }

    function deactivateAll() {
      tiles.forEach(function (tile) {
        tile.classList.remove("is-active");
      });
    }

    tiles.forEach(function (tile, index) {
      tile.addEventListener("mouseenter", function () {
        activate(tile);
      });

      tile.addEventListener("focus", function () {
        activate(tile);
      });

      tile.addEventListener("keydown", function (event) {
        var nextIndex = null;

        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          nextIndex = (index + 1) % tiles.length;
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          nextIndex = (index - 1 + tiles.length) % tiles.length;
        }

        if (nextIndex !== null && typeof tiles[nextIndex].focus === "function") {
          event.preventDefault();
          tiles[nextIndex].focus();
        }
      });
    });

    group.addEventListener("mouseleave", function () {
      if (!group.contains(document.activeElement)) {
        deactivateAll();
      }
    });

    group.addEventListener("focusout", function () {
      window.setTimeout(function () {
        if (!group.contains(document.activeElement)) {
          deactivateAll();
        }
      }, 0);
    });

    deactivateAll();
    group.dataset.interactiveServiceTilesInitialized = "true";
  }

  function initializeAll() {
    document.querySelectorAll("[data-interactive-service-tiles]").forEach(initializeServiceTiles);
  }

  function scheduleInitialization() {
    if (initializationScheduled) {
      return;
    }

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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
}());
