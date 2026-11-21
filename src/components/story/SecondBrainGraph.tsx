import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { gsap } from 'gsap';
import { NODES, EDGES, byId, neighbors, type BrainNode } from './secondBrain';

type P = { x: number; y: number };
type Size = { w: number; h: number; mobile: boolean };

const shown = (n: BrainNode, mobile: boolean) => !mobile || n.mx !== undefined;
const base = (n: BrainNode, { w, h, mobile }: Size): P =>
    mobile ? { x: (n.mx! / 600) * w, y: (n.my! / 800) * h } : { x: (n.x / 1000) * w, y: (n.y / 600) * h };

type Box = (id: string) => { w: number; h: number };
const GAP = 20;

/** Zielpositionen (Mitte jedes Knotens, in px der Bühne) für Übersicht oder Fokus. */
function layout(sel: string | null, s: Size, card: { w: number; h: number }, box: Box): Record<string, P> {
    const cardH = card.h;
    const nodes = NODES.filter((n) => shown(n, s.mobile));
    const out = Object.fromEntries(nodes.map((n) => [n.id, base(n, s)]));
    if (!sel || !out[sel]) return out;
    const others = nodes.filter((n) => n.id !== sel);

    if (s.mobile) {
        // Detailkarte oben über die volle Breite, die übrigen Knoten zweispaltig darunter
        out[sel] = { x: s.w / 2, y: cardH / 2 };
        others.forEach((n, i) => {
            out[n.id] = { x: s.w * (i % 2 ? 0.73 : 0.27), y: cardH + 56 + Math.floor(i / 2) * 64 };
        });
        return out;
    }

    // Desktop: Karte in der Mitte, die anderen rücken ringsum dicht an ihren Rand.
    // Reihenfolge wie in der Übersicht, damit die Wege kurz bleiben.
    const c = { x: s.w / 2, y: s.h / 2 };
    const ang = (n: BrainNode) => Math.atan2(base(n, s).y - c.y, base(n, s).x - c.x);
    const ring = others.sort((a, b) => ang(a) - ang(b));
    const start = ang(ring[0]);
    out[sel] = c;
    ring.forEach((n, i) => {
        const a = start + (i * 2 * Math.PI) / ring.length;
        const { w, h } = box(n.id);
        // Kleinster Abstand entlang des Winkels, bei dem der Knoten die Karte nicht mehr berührt
        const t = Math.min((card.w / 2 + w / 2 + GAP) / Math.abs(Math.cos(a)), (card.h / 2 + h / 2 + GAP) / Math.abs(Math.sin(a)));
        out[n.id] = { x: c.x + Math.cos(a) * t, y: c.y + Math.sin(a) * t };
    });
    return out;
}

const pct = (v: number, of: number) => (v / of) * 100;

export default function SecondBrainGraph() {
    const [hover, setHover] = useState<string | null>(null);
    const [selected, setSelected] = useState<string | null>(null);
    const [size, setSize] = useState<Size | null>(null);
    const last = useRef<string | null>(null);
    if (selected) last.current = selected;
    const card = last.current ? byId[last.current] : null;

    const stage = useRef<HTMLDivElement>(null);
    const cardEl = useRef<HTMLDivElement>(null);
    const backBtn = useRef<HTMLButtonElement>(null);
    const nodeEls = useRef<Record<string, HTMLButtonElement | null>>({});
    const lineEls = useRef<(HTMLDivElement | null)[]>([]);
    const pos = useRef<Record<string, P>>({});
    const tween = useRef<gsap.core.Tween | null>(null);
    const prevSel = useRef<string | null>(null);

    const active = hover ?? selected;
    const near = active ? new Set([active, ...neighbors(active)]) : null;

    // Bühne messen. Ohne Messung (SSR, kein JS) gelten die CSS-Positionen in Prozent.
    useLayoutEffect(() => {
        const el = stage.current!;
        const desk = window.matchMedia('(min-width: 1024px)');
        const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight, mobile: !desk.matches });
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Knoten und Linien aus denselben Positionen setzen: so bleiben die Linien bei jeder Bewegung angeheftet (G15).
    const apply = (p: Record<string, P>) => {
        for (const [id, el] of Object.entries(nodeEls.current)) {
            if (el && p[id]) el.style.transform = `translate(${p[id].x}px, ${p[id].y}px) translate(-50%, -50%)`;
        }
        EDGES.forEach(([a, b], i) => {
            const el = lineEls.current[i];
            if (!el || !p[a] || !p[b]) return;
            const dx = p[b].x - p[a].x;
            const dy = p[b].y - p[a].y;
            el.style.transform = `translate(${p[a].x}px, ${p[a].y - 0.5}px) rotate(${Math.atan2(dy, dx)}rad) scaleX(${Math.hypot(dx, dy)})`;
        });
    };

    useLayoutEffect(() => {
        if (!size) return;
        const c = cardEl.current!;
        const box: Box = (id) => ({ w: nodeEls.current[id]!.offsetWidth, h: nodeEls.current[id]!.offsetHeight });
        const target = layout(selected, size, { w: c.offsetWidth, h: c.offsetHeight }, box);
        const from = pos.current;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const animate = prevSel.current !== selected && !reduce && Object.keys(from).length > 0;
        prevSel.current = selected;
        tween.current?.kill();

        const step = (t: number) => {
            const cur: Record<string, P> = {};
            for (const [id, b] of Object.entries(target)) {
                const a = from[id] ?? b;
                cur[id] = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
            }
            pos.current = cur;
            apply(cur);
        };

        if (!animate) return step(1);
        const s = { t: 0 };
        tween.current = gsap.to(s, { t: 1, duration: 0.5, ease: 'power3.out', onUpdate: () => step(s.t) });
    }, [selected, size]);

    const open = (id: string) => {
        setSelected(id);
        requestAnimationFrame(() => backBtn.current?.focus({ preventScroll: true }));
    };
    const close = () => {
        const id = selected;
        setSelected(null);
        if (id) requestAnimationFrame(() => nodeEls.current[id]?.focus({ preventScroll: true }));
    };

    return (
        <div
            ref={stage}
            class={`brain-stage relative h-[34rem] sm:h-[36rem] lg:h-full [container-type:size] ${size ? 'is-live' : ''}`}
            onKeyDown={(e) => e.key === 'Escape' && selected && close()}
        >
            {EDGES.map(([a, b], i) => {
                const A = byId[a];
                const B = byId[b];
                const lit = active !== null && (a === active || b === active);
                return (
                    <div
                        ref={(el) => { lineEls.current[i] = el; }}
                        class={[
                            'brain-line',
                            lit && 'is-lit',
                            active && !lit && 'is-dim',
                            (A.mx === undefined || B.mx === undefined) && 'max-lg:hidden',
                        ].filter(Boolean).join(' ')}
                        style={{
                            '--x1': pct(A.x, 1000), '--y1': pct(A.y, 600), '--x2': pct(B.x, 1000), '--y2': pct(B.y, 600),
                            '--mx1': pct(A.mx ?? 0, 600), '--my1': pct(A.my ?? 0, 800), '--mx2': pct(B.mx ?? 0, 600), '--my2': pct(B.my ?? 0, 800),
                            animationDelay: `${(i % 7) * -0.9}s`,
                        }}
                        aria-hidden="true"
                    />
                );
            })}

            {NODES.map((n) => {
                const isSel = selected === n.id;
                const lit = near?.has(n.id) ?? false;
                return (
                    <button
                        type="button"
                        ref={(el) => { nodeEls.current[n.id] = el; }}
                        class={[
                            'brain-node rounded-2xl border bg-white/90 px-3 py-2 sm:px-4 sm:py-3 text-left whitespace-nowrap cursor-pointer',
                            'shadow-[0_18px_40px_-24px_rgba(20,20,20,0.18)] transition-[opacity,border-color] duration-300',
                            'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink',
                            lit ? 'border-ink' : 'border-silverBorder',
                            isSel ? 'opacity-0 pointer-events-none' : near && !lit ? 'opacity-35' : 'opacity-100',
                            n.mx === undefined && 'max-lg:hidden',
                        ].filter(Boolean).join(' ')}
                        style={{ '--x': pct(n.x, 1000), '--y': pct(n.y, 600), '--mx': pct(n.mx ?? 0, 600), '--my': pct(n.my ?? 0, 800) }}
                        tabIndex={isSel ? -1 : 0}
                        aria-expanded={isSel}
                        aria-controls="brain-detail"
                        onMouseEnter={() => setHover(n.id)}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover(n.id)}
                        onBlur={() => setHover(null)}
                        onClick={() => (isSel ? close() : open(n.id))}
                    >
                        <span class={`brain-glow ${hover === n.id ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" />
                        <span class="relative block text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-inkMuted">{n.label}</span>
                        <span class="relative max-sm:hidden block text-sm text-ink mt-1">
                            {n.placeholder ? <span class="placeholder" title="Platzhalter">{n.sample}</span> : n.sample}
                        </span>
                    </button>
                );
            })}

            {/* Der gewählte Knoten klappt an seiner Fokusposition zur Detailkarte auf */}
            <div
                id="brain-detail"
                ref={cardEl}
                aria-live="polite"
                inert={!selected}
                class={[
                    'absolute z-10 left-0 top-0 w-full lg:w-80 lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2',
                    'rounded-2xl border border-ink bg-white p-6 shadow-[0_18px_40px_-24px_rgba(20,20,20,0.18)]',
                    'transition-[opacity,scale] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                    selected ? 'opacity-100 scale-100 delay-200' : 'opacity-0 scale-[0.97] pointer-events-none',
                ].join(' ')}
            >
                {card && (
                    <>
                        <span class="text-[11px] font-mono uppercase tracking-wider text-inkMuted">{card.label}</span>
                        <h3 class="font-display text-xl font-semibold tracking-tight text-ink mt-2">
                            {card.placeholder ? <span class="placeholder" title="Platzhalter">{card.sample}</span> : card.sample}
                        </h3>
                        <p class="text-sm text-inkMuted mt-3 leading-relaxed">{card.detail}</p>
                        <p class="text-xs text-inkMuted mt-4">
                            Verbunden mit: <span class="text-ink">{neighbors(card.id).map((id) => byId[id].label).join(', ')}</span>
                        </p>
                        <button
                            type="button"
                            ref={backBtn}
                            class="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-ink/20 text-sm text-ink hover:border-ink transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                            onClick={close}
                        >
                            ← Zur Übersicht
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
