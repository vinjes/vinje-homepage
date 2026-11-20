import type { APIRoute } from 'astro';

export const prerender = false;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `Du bist der offizielle KI-Berater von "vinje" (www.vinje.de), dem Studio für KI-Automatisierung, Machine Learning sowie Datenanalyse & BI, gegründet von Vincent Grüneklee und Jesse Bakenhus.

Wichtige Fakten über vinje:
- Zielgruppe: Mittelstand und E-Commerce.
- Haupt-Schmerzpunkt, den vinje löst: Lästige, zeitraubende E-Mails, Telefonanrufe und wiederkehrende Kundenanfragen. Wir automatisieren und verbessern die gesamte Kundenkommunikation und Kundensysteme, um Teams spürbar produktiver zu machen.
- Differenzierung: Echte Expertise in Data Science und KI – keine oberflächliche "KI-Hype-Agentur".
- Gründerduo (Vincent Grüneklee & Jesse Bakenhus):
  - Zwei vielseitige Data-Science- & KI-Generalisten auf Augenhöhe.
  - Kennen sich nicht nur aus dem gemeinsamen Studium, sondern haben bereits beim gleichen Arbeitgeber mehrere Projekte erfolgreich zusammen in der Praxis gemeistert.
  - Leitsatz: "Kein KI-Hype ohne echten Nutzen – wir verbinden tiefes Data-Science-Verständnis mit pragmatischer Umsetzung."
- 3 Leistungsbereiche (in dieser Priorität):
  1. KI-Automatisierung (Hauptfokus):
     - "backmail": Unser intelligenter KI-E-Mail-Client für automatisierte Beantwortung, Klassifizierung und Abwicklung von Kunden-E-Mails.
     - "backcall": Unser KI-Voice-Assistant für Telefonanrufe, der Kundenanrufe entgegennimmt, Anliegen löst, vorqualifiziert und ins System einträgt.
     - Außerdem: Multi-Agent-Systeme, RAG-Chatbots, KI-Integrationen und individuelle Web-Tools.
  2. Machine Learning: Forecasting-Modelle (z. B. Absatz, Nachfrage, Bestand im E-Commerce & Mittelstand), maßgeschneiderte Python-Pipelines, prädiktive Modelle.
  3. Datenanalyse & BI: Übersichtliche Dashboards, SQL-Datenbankarchitekturen und individuelle interne Web-Tools.
- Tech-Stack & DSGVO / Europäische Souveränität:
  - 100 % DSGVO-konform: Wir verwenden ausschließlich europäische Hoster und europäische bzw. lokale Sprachmodelle wie Mistral AI (keine Weitergabe sensibler Kundendaten an außereuropäische Clouds).
  - Weiterer Tech-Stack: Python, SQL, Mistral / Lokale LLMs, Supabase (EU / Self-Hosted), Docker.
- Preismodell: KEINE Stundensätze! Wir arbeiten mit einem vereinbarten Projekt-Festpreis für die Umsetzung plus monatlichen Zahlungen (Retainer) für Betrieb, Wartung und Weiterentwicklung (auf Verhandlungsbasis je nach Projektumfang).
- WICHTIG: Erfinde NIEMALS fiktive Fallstudien oder ausgedachte Prozentzahlen. Bleib ehrlich, technisch fundiert und bodenständig.
- Kontakt: info@vinje.de, 2-Klick-Projektkonfigurator oder direkter 20-Minuten-Termin über Calendly auf der Website.`;

function detectTopic(text: string): string {
  const lower = text.toLowerCase();
  if (
    lower.includes('prognose') ||
    lower.includes('forecast') ||
    lower.includes('machine learning') ||
    lower.includes('ml') ||
    lower.includes('prädiktiv') ||
    lower.includes('bestand')
  ) {
    return 'Machine Learning';
  }
  if (
    lower.includes('dashboard') ||
    lower.includes('bi') ||
    lower.includes('sql') ||
    lower.includes('reporting') ||
    lower.includes('datenanalyse')
  ) {
    return 'Datenanalyse & BI';
  }
  if (
    lower.includes('pilot') ||
    lower.includes('kosten') ||
    lower.includes('preis') ||
    lower.includes('festpreis') ||
    lower.includes('ablauf') ||
    lower.includes('erstgespräch')
  ) {
    return 'Potenzial-Beratung';
  }
  return 'KI-Automatisierung';
}

function generateSmartFallbackReply(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (
    lower.includes('mail') ||
    lower.includes('backmail') ||
    lower.includes('anruf') ||
    lower.includes('telefon') ||
    lower.includes('voice') ||
    lower.includes('backcall') ||
    lower.includes('kunden') ||
    lower.includes('use-case') ||
    lower.includes('use case') ||
    lower.includes('lohnt')
  ) {
    return 'Für die Automatisierung zeitraubender Kundenkommunikation im **Mittelstand und E-Commerce** setzen wir auf zwei spezialisierte Kernsysteme:\n• **backmail (KI-E-Mail-Client)**: Verarbeitet, strukturiert und beantwortet eingehende Kunden-E-Mails automatisch mit direktem Abgleich eurer Shop-, ERP- oder CRM-Daten.\n• **backcall (KI-Voice-Assistant)**: Nimmt Telefonanrufe selbstständig entgegen, beantwortet wiederkehrende Fragen, qualifiziert Anliegen vor und leitet strukturierte Infos weiter.\n• Ergänzt durch **Multi-Agent-Systeme, RAG-Chatbots** und **Python-Forecasting-Pipelines**.';
  }

  if (
    lower.includes('kosten') ||
    lower.includes('preis') ||
    lower.includes('stundensatz') ||
    lower.includes('budget') ||
    lower.includes('festpreis')
  ) {
    return 'Wir arbeiten bewusst **ohne Stundensatz**: Bei uns gibt es einen vorab transparent vereinbarten **Projekt-Festpreis** für die Umsetzung sowie eine **monatliche Pauschale** für laufenden Betrieb, Wartung und Weiterentwicklung (auf Verhandlungsbasis je nach Umfang). Im 20-minütigen Erstgespräch stecken wir euren Rahmen unverbindlich ab.';
  }

  if (
    lower.includes('dsgvo') ||
    lower.includes('datenschutz') ||
    lower.includes('europa') ||
    lower.includes('europäisch') ||
    lower.includes('mistral') ||
    lower.includes('host') ||
    lower.includes('lokal') ||
    lower.includes('stack') ||
    lower.includes('technik')
  ) {
    return 'Datenschutz ist bei uns kompromisslos **100 % DSGVO-konform**: Wir setzen ausschließlich auf **europäische Hoster** und verwenden **europäische bzw. lokale Sprachmodelle wie Mistral AI**. Sensible Kunden-E-Mails und Telefonate verlassen niemals den europäischen Rechtsraum. Unser Kern-Stack basiert auf **Mistral, Python, SQL, Supabase und Docker**.';
  }

  if (lower.includes('pilot') || lower.includes('ablauf') || lower.includes('start') || lower.includes('wie läuft')) {
    return 'Wir starten pragmatisch in 4 Schritten:\n1. **Audit & Potenzialanalyse**: Wir schauen uns eure aktuellen Zeitfresser (z. B. Kunden-Mails, Telefonate, Datenflüsse) an.\n2. **Architektur & Prototyp**: Schneller funktionaler Prototyp auf euren echten Daten.\n3. **Entwicklung & Integration**: Saubere Einbindung zum vereinbarten Projekt-Festpreis.\n4. **Betrieb & Weiterentwicklung**: Laufende Betreuung auf monatlicher Basis.';
  }

  if (lower.includes('vincent') || lower.includes('jesse') || lower.includes('team') || lower.includes('wer seid') || lower.includes('agentur')) {
    return 'Hinter **vinje** stehen **Vincent Grüneklee und Jesse Bakenhus**. Wir sind keine oberflächliche KI-Hype-Agentur, sondern zwei eingespielte Data-Science- & KI-Generalisten: Wir kennen uns aus dem gemeinsamen Studium und haben bereits beim gleichen Arbeitgeber mehrere Projekte zusammen in der Praxis umgesetzt.';
  }

  return 'Genau solche Anforderungen schauen wir uns bei **vinje** gerne direkt an – egal ob es um **Voice- & E-Mail-Automatisierung**, **Multi-Agent-Systeme**, **Forecasting-Modelle** oder **individuelle Web-Tools & Dashboards** geht. Übernehmt euer Thema gerne per Klick ins Formular oder bucht direkt einen 20-Min-Termin mit Vincent & Jesse!';
}

async function callLLM(messages: ChatMessage[]): Promise<string | null> {
  const mistralKey = import.meta.env.MISTRAL_API_KEY || process.env.MISTRAL_API_KEY;
  const openaiKey = import.meta.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const geminiKey = import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const anthropicKey = import.meta.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

  // 1. Mistral AI (Europäisches LLM – Standard-Präferenz)
  if (mistralKey) {
    const model = import.meta.env.MISTRAL_MODEL || process.env.MISTRAL_MODEL || 'mistral-small-latest';
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mistralKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 420,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.slice(-8),
        ],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || null;
    }
  }

  if (openaiKey) {
    const model = import.meta.env.OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 420,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.slice(-8),
        ],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || null;
    }
  }

  if (geminiKey) {
    const model = import.meta.env.GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const contents = messages.slice(-8).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 0.35, maxOutputTokens: 420 },
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    }
  }

  if (anthropicKey) {
    const model =
      import.meta.env.ANTHROPIC_MODEL || process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 420,
        system: SYSTEM_PROMPT,
        messages: messages.slice(-8),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.content?.[0]?.text?.trim() || null;
    }
  }

  return null;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];

    const messages: ChatMessage[] = rawMessages
      .filter(
        (m: any) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0
      )
      .map((m: any) => ({
        role: m.role,
        content: m.content.trim().slice(0, 1500),
      }));

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Keine Nachricht übergeben.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const lastUserMessage =
      [...messages].reverse().find((m) => m.role === 'user')?.content || '';

    let reply = await callLLM(messages);
    if (!reply) {
      reply = generateSmartFallbackReply(lastUserMessage);
    }

    const recommendedTopic = detectTopic(`${lastUserMessage} ${reply}`);

    return new Response(
      JSON.stringify({
        ok: true,
        reply,
        recommendedTopic,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Chat API error:', err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Der KI-Assistent ist gerade kurzzeitig nicht erreichbar.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
