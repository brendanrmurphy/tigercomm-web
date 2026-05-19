(function () {
  const highlightClass = "glossary__match";
  const normalizeText = (text) => text.toLowerCase().trim();
  const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const clearHighlights = (container) => {
    container.querySelectorAll(`mark.${highlightClass}`).forEach((highlight) => {
      const text = document.createTextNode(highlight.textContent);

      highlight.replaceWith(text);
      text.parentNode.normalize();
    });
  };

  const highlightMatches = (container, query) => {
    if (!query) {
      return;
    }

    const matcher = new RegExp(escapeRegExp(query), "gi");
    const textNodes = [];
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue.trim() || !matcher.test(node.nodeValue)) {
            matcher.lastIndex = 0;
            return NodeFilter.FILTER_REJECT;
          }

          matcher.lastIndex = 0;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      const text = node.nodeValue;
      let lastIndex = 0;

      text.replace(matcher, (match, index) => {
        fragment.append(document.createTextNode(text.slice(lastIndex, index)));

        const highlight = document.createElement("mark");
        highlight.className = highlightClass;
        highlight.textContent = match;
        fragment.append(highlight);

        lastIndex = index + match.length;
      });

      fragment.append(document.createTextNode(text.slice(lastIndex)));
      node.replaceWith(fragment);
      matcher.lastIndex = 0;
    });
  };

  const initStickyNav = () => {
    document.querySelectorAll("[data-glossary-nav]").forEach((nav) => {
      const sentinel = nav.parentElement.querySelector(".glossary__sticky-sentinel");

      if (!sentinel || !sentinel.classList.contains("glossary__sticky-sentinel")) {
        return;
      }

      const setStickyState = () => {
        const sentinelTop = sentinel.getBoundingClientRect().top;
        nav.classList.toggle("is-sticky", sentinelTop < 0);
      };

      setStickyState();
      window.addEventListener("scroll", setStickyState, { passive: true });
      window.addEventListener("resize", setStickyState);
    });
  };

  const initGlossarySearch = () => {
    document.querySelectorAll(".glossary").forEach((glossary) => {
      const search = glossary.querySelector("[data-glossary-search]");
      const terms = Array.from(glossary.querySelectorAll("[data-glossary-term]"));
      const headings = Array.from(glossary.querySelectorAll("[data-glossary-letter-heading]"));
      const alphaLinks = Array.from(glossary.querySelectorAll("[data-glossary-alpha-link]"));
      const noResults = glossary.querySelector("[data-glossary-no-results]");

      if (!search || !terms.length) {
        return;
      }

      const updateGlossary = () => {
        const query = normalizeText(search.value);
        const visibleLetters = new Set();
        let visibleCount = 0;

        terms.forEach((term) => {
          clearHighlights(term);

          const isVisible = !query || normalizeText(term.textContent).includes(query);
          term.hidden = !isVisible;

          if (isVisible) {
            visibleCount += 1;
            visibleLetters.add(term.dataset.glossaryLetter);
            highlightMatches(term, query);
          }
        });

        headings.forEach((heading) => {
          heading.hidden = !visibleLetters.has(heading.dataset.glossaryLetter);
        });

        alphaLinks.forEach((link) => {
          link.hidden = Boolean(query) && !visibleLetters.has(link.dataset.glossaryLetter);
        });

        if (noResults) {
          noResults.hidden = visibleCount > 0;
        }
      };

      search.addEventListener("input", updateGlossary);
      updateGlossary();
    });
  };

  const initGlossary = () => {
    initStickyNav();
    initGlossarySearch();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGlossary);
  } else {
    initGlossary();
  }
})();
