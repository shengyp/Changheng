import { gsap } from 'gsap'

export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function animatePageEnter(root, selectors = {}) {
  if (!root || prefersReducedMotion()) return null

  const heroSelector = selectors.hero || '.motion-hero'
  const cardSelector = selectors.card || '.motion-card'
  const toolbarSelector = selectors.toolbar || '.motion-toolbar'
  const tableSelector = selectors.table || '.motion-table'

  return gsap.context(() => {
    const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })
    const scoped = (selector) => gsap.utils.toArray(root.querySelectorAll(selector))
    const heroes = scoped(heroSelector)
    const cards = scoped(cardSelector)
    const toolbars = scoped(toolbarSelector)
    const tables = scoped(tableSelector)

    if (heroes.length) {
      timeline.fromTo(
        heroes,
        { autoAlpha: 0, y: 18, scale: 0.985 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.58, clearProps: 'transform,opacity,visibility' },
      )
    }

    if (cards.length) {
      timeline.fromTo(
        cards,
        { autoAlpha: 0, y: 18 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.48,
          stagger: 0.055,
          clearProps: 'transform,opacity,visibility',
        },
        heroes.length ? '-=0.28' : 0,
      )
    }

    if (toolbars.length) {
      timeline.fromTo(
        toolbars,
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.34, clearProps: 'transform,opacity,visibility' },
        '-=0.22',
      )
    }

    if (tables.length) {
      timeline.fromTo(
        tables,
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.4, clearProps: 'transform,opacity,visibility' },
        '-=0.18',
      )
    }
  }, root)
}
