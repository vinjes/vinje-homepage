// Umschalter der Leistungs-Demos: [data-dash] enthält Buttons [data-set] und vorgerenderte Inhalte [data-only]
for (const dash of document.querySelectorAll<HTMLElement>('[data-dash]')) {
  dash.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-set]');
    if (!btn) return;
    for (const b of dash.querySelectorAll('[data-set]')) b.setAttribute('aria-pressed', String(b === btn));
    for (const el of dash.querySelectorAll<HTMLElement>('[data-only]')) el.hidden = el.dataset.only !== btn.dataset.set; // Animationen starten neu
  });
}
