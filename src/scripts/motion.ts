import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
gsap.defaults({ ease: 'power3.out' });

// Desktop: gepinnte Scroll-Phasen. Mobile: nur einmaliges Einblenden. Reduced Motion: keine Animation (keine Query greift).
export const DESKTOP = '(min-width: 1024px) and (prefers-reduced-motion: no-preference)';
export const MOBILE = '(max-width: 1023px) and (prefers-reduced-motion: no-preference)';

export const mm = gsap.matchMedia();

/** Blendet Elemente einmalig ein, sobald sie den Viewport erreichen (Mobile-Variante). */
export function revealOnce(targets: Element[] | NodeListOf<Element>) {
    gsap.set(targets, { opacity: 0, y: 24 });
    ScrollTrigger.batch(targets as Element[], {
        start: 'top 90%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 }),
    });
}

/** Zählt [data-count] von 0 hoch. Ohne Animation steht die Endzahl schon im HTML; beim Revert per resetCounts zurücksetzen. */
export function countUp(el: HTMLElement, vars: gsap.TweenVars = {}) {
    const end = el.dataset.count!;
    const o = { v: 0 };
    el.textContent = '0';
    return gsap.to(o, {
        v: Number(end),
        duration: 1,
        ease: 'power2.out',
        onUpdate: () => { el.textContent = String(Math.round(o.v)); },
        ...vars,
    });
}

export { gsap, ScrollTrigger };

export const resetCounts = (root: Element) =>
    root.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => { el.textContent = el.dataset.count!; });
