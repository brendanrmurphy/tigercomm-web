(function () {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const formatValue = (value, decimals) => {
    return value.toLocaleString(undefined, {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals
    });
  };

  const getDecimals = (value) => {
    const valueText = String(value);
    const decimalPart = valueText.split(".")[1];

    return decimalPart ? decimalPart.length : 0;
  };

  const setFinalValue = (valueEl) => {
    const target = Number(valueEl.dataset.countUpValue || 0);
    const suffix = valueEl.dataset.countUpSuffix || "";
    const decimals = getDecimals(valueEl.dataset.countUpValue || 0);

    valueEl.textContent = `${formatValue(target, decimals)}${suffix}`;
  };

  const animateValue = (valueEl, duration) => {
    const target = Number(valueEl.dataset.countUpValue || 0);
    const suffix = valueEl.dataset.countUpSuffix || "";
    const decimals = getDecimals(valueEl.dataset.countUpValue || 0);
    const start = performance.now();

    if (!Number.isFinite(target) || duration <= 0 || prefersReducedMotion.matches) {
      setFinalValue(valueEl);
      return;
    }

    valueEl.textContent = `${formatValue(0, decimals)}${suffix}`;

    const tick = (timestamp) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = target * easedProgress;

      valueEl.textContent = `${formatValue(currentValue, decimals)}${suffix}`;

      if (progress < 1) {
        window.requestAnimationFrame(tick);
      } else {
        setFinalValue(valueEl);
      }
    };

    window.requestAnimationFrame(tick);
  };

  const runStats = (statsEl) => {
    if (statsEl.dataset.countUpInitialized === "true") {
      return;
    }

    statsEl.dataset.countUpInitialized = "true";

    const duration = Number(statsEl.dataset.countUpDuration || 1400);
    const values = statsEl.querySelectorAll("[data-count-up-value]");

    values.forEach((valueEl) => animateValue(valueEl, duration));
  };

  const initStats = () => {
    const statsGroups = document.querySelectorAll("[data-count-up-stats]");

    if (!statsGroups.length) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      statsGroups.forEach(runStats);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        runStats(entry.target);
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.25
    });

    statsGroups.forEach((statsEl) => observer.observe(statsEl));
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initStats);
  } else {
    initStats();
  }
})();
