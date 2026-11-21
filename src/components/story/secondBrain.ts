// Vorab berechnete Positionen. Desktop (x, y) im Raster 1000 × 600, Mobile (mx, my) im Raster 600 × 800.
// Knoten ohne mx/my erscheinen auf Mobile nicht.
export type BrainNode = {
    id: string;
    label: string;
    sample: string;
    detail: string;
    x: number;
    y: number;
    mx?: number;
    my?: number;
    placeholder?: boolean;
};

export const NODES: BrainNode[] = [
    { id: 'unternehmen', label: 'Unternehmen', sample: 'Ihr Unternehmen', placeholder: true, x: 500, y: 300, mx: 300, my: 420,
        detail: 'Das Zentrum: Alles, was hereinkommt, wird mit dem verknüpft, was schon da ist. So entsteht euer Second Brain.' },
    { id: 'mail', label: 'Mail', sample: 'Anfrage: Saal für 120 Gäste', x: 170, y: 190, mx: 170, my: 190,
        detail: 'Die Anfrage kommt per Mail. Absender, Datum und Gästezahl werden erkannt und dem passenden Kontakt zugeordnet.' },
    { id: 'person', label: 'Person', sample: 'Kontakt der Eventagentur', x: 420, y: 70, mx: 430, my: 190,
        detail: 'Wer hat angefragt, was wurde schon besprochen? Der ganze Verlauf mit einem Kontakt liegt an einer Stelle.' },
    { id: 'projekt', label: 'Projekt', sample: 'Firmenfeier im Juni', x: 660, y: 100, mx: 470, my: 500,
        detail: 'Aus der Anfrage wird ein Projekt, mit allen Mails, Terminen und Dokumenten, die dazugehören.' },
    { id: 'angebot', label: 'Angebot', sample: 'Saal und Catering', x: 840, y: 250, mx: 300, my: 680,
        detail: 'Das Angebot baut auf Projekt und früheren Absprachen auf, statt bei null anzufangen.' },
    { id: 'termin', label: 'Termin', sample: 'Besichtigung, Do 10 Uhr', x: 790, y: 470, mx: 130, my: 500,
        detail: 'Besichtigungen und Rückrufe landen direkt im Kalender, mit Bezug zum Projekt.' },
    { id: 'mitarbeiter', label: 'Mitarbeiter', sample: 'Zuständig: Bankett-Team', x: 210, y: 440,
        detail: 'Jede Aufgabe hat eine zuständige Person im Team, die den Zusammenhang sofort sieht.' },
    { id: 'steuern', label: 'Steuern', sample: 'Beleg für die Buchhaltung', x: 520, y: 535,
        detail: 'Rechnungen und Belege werden dem Vorgang zugeordnet und sind für die Buchhaltung auffindbar.' },
];

export const EDGES: [string, string][] = [
    ...NODES.slice(1).map((n): [string, string] => ['unternehmen', n.id]),
    ['mail', 'person'], ['person', 'projekt'], ['projekt', 'angebot'], ['angebot', 'termin'],
    ['termin', 'steuern'], ['steuern', 'mitarbeiter'], ['mitarbeiter', 'mail'], ['projekt', 'termin'],
    ['person', 'mitarbeiter'],
];

export const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

export const neighbors = (id: string) =>
    EDGES.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : []));
