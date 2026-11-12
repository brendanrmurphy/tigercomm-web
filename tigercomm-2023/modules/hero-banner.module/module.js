document.querySelectorAll("[data-hero-banner]").forEach((hero) => {
  if (hero.dataset.heroBannerInitialized === "true") return;
  hero.dataset.heroBannerInitialized = "true";

  const images = Array.from(
    hero.querySelectorAll("[data-hero-banner-image]"),
    (item) => item.dataset.heroBannerImage,
  ).filter(Boolean);

  if (!images.length) return;

  const shouldRandomize =
    hero.dataset.randomizeBackground === "true" && images.length > 1;
  const selectedImage = shouldRandomize
    ? images[Math.floor(Math.random() * images.length)]
    : images[0];

  hero.style.backgroundImage = `url(${JSON.stringify(selectedImage)})`;
});
