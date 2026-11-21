// Prognose-Diagramm für die Leistungs-Demos: Ist-Linie, Prognose ab dem letzten Ist-Punkt, wachsendes Unsicherheitsband
export function forecastChart(ist: number[], fc: number[], o: { lo: number; hi: number; spread?: number; W?: number; H?: number }) {
  const { lo, hi, spread = 2.2, W = 320, H = 120 } = o;
  const dx = (W - 8) / (ist.length + fc.length - 2); // fc[0] = letzter Ist-Wert; 8px Rand für den Endpunkt
  const y = (v: number) => H - 10 - ((v - lo) / (hi - lo)) * (H - 20);
  const pts = (vals: number[], i0: number, off = 0) => vals.map((v, i) => `${((i0 + i) * dx).toFixed(1)},${y(v + off * i).toFixed(1)}`);
  const i0 = ist.length - 1;
  return {
    W,
    H,
    ist: pts(ist, 0).join(' '),
    fc: pts(fc, i0).join(' '),
    band: [...pts(fc, i0, spread), ...pts(fc, i0, -spread).reverse()].join(' '),
    last: pts(fc, i0).at(-1)!.split(','),
    todayX: (i0 * dx).toFixed(1),
  };
}
