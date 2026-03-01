export function animateCountUp(
  element: HTMLElement,
  start: number,
  end: number,
  duration: number = 1000,
): void {
  const startTime = performance.now();
  const diff = end - start;

  function update(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const current = Math.round(start + diff * easeOutQuart);

    element.textContent = formatNumber(current);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

export function pulseElement(element: HTMLElement): void {
  element.classList.remove("pulse-once");
  void element.offsetWidth;
  element.classList.add("pulse-once");
}

export function glowPulseElement(element: HTMLElement): void {
  element.classList.remove("glow-pulse-once");
  void element.offsetWidth;
  element.classList.add("glow-pulse-once");
}

export function animateAllCounters(container: HTMLElement): void {
  const counters = container.querySelectorAll<HTMLElement>("[data-count]");

  counters.forEach((el, index) => {
    const end = parseInt(el.dataset.count || "0", 10);
    el.style.animationDelay = `${index * 100}ms`;
    animateCountUp(el, 0, end, 800 + index * 100);
  });
}
