import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const topic = String(body.topic || 'KI-Automatisierung').trim();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const message = String(body.message || '').trim();
    const honeypot = String(body.website || '').trim();

    // Spam-Schutz (Honeypot-Feld sollte leer sein)
    if (honeypot) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Bitte füllt alle Pflichtfelder (Name, E-Mail und Projektbeschreibung) aus.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Bitte gebt eine gültige E-Mail-Adresse an.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Server-Konfiguration fehlt: RESEND_API_KEY ist noch nicht in der .env hinterlegt.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(apiKey);
    const toEmail =
      import.meta.env.CONTACT_TO_EMAIL ||
      process.env.CONTACT_TO_EMAIL ||
      'info@vinje.de';
    const fromEmail =
      import.meta.env.CONTACT_FROM_EMAIL ||
      process.env.CONTACT_FROM_EMAIL ||
      'vinje Website <onboarding@resend.dev>';

    const safeTopic = escapeHtml(topic);
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      replyTo: email,
      subject: `[vinje Anfrage] ${topic} — ${name}`,
      text: `Neue Projektanfrage über www.vinje.de\n\nThema: ${topic}\nName / Unternehmen: ${name}\nE-Mail: ${email}\n\nNachricht:\n${message}`,
      html: `
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #F7F6F2; padding: 32px; color: #141414;">
          <div style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E0D8; border-radius: 16px; padding: 28px;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #555555; margin-bottom: 6px;">
              vinje // Neue Projektanfrage
            </div>
            <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 600; color: #141414;">
              ${safeTopic}
            </h2>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #555555; width: 150px; border-bottom: 1px solid #E2E0D8;">Name / Unternehmen</td>
                <td style="padding: 8px 0; color: #141414; font-weight: 500; border-bottom: 1px solid #E2E0D8;">${safeName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #555555; border-bottom: 1px solid #E2E0D8;">E-Mail-Adresse</td>
                <td style="padding: 8px 0; color: #141414; font-weight: 500; border-bottom: 1px solid #E2E0D8;">
                  <a href="mailto:${safeEmail}" style="color: #141414; text-decoration: underline;">${safeEmail}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #555555; border-bottom: 1px solid #E2E0D8;">Fokusthema</td>
                <td style="padding: 8px 0; color: #141414; font-weight: 500; border-bottom: 1px solid #E2E0D8;">${safeTopic}</td>
              </tr>
            </table>

            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #555555; margin-bottom: 8px;">
              Projektbeschreibung
            </div>
            <div style="background-color: #F7F6F2; border: 1px solid #E2E0D8; border-radius: 12px; padding: 16px; font-size: 14px; line-height: 1.6; color: #141414;">
              ${safeMessage}
            </div>

            <div style="margin-top: 24px; font-size: 12px; color: #555555;">
              Tipp: Ihr könnt direkt auf diese E-Mail antworten – als Antwortadresse (Reply-To) ist <strong>${safeEmail}</strong> hinterlegt.
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Resend API Error:', error);
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Beim Versenden der E-Mail ist ein Fehler aufgetreten. Bitte schreibt uns direkt an info@vinje.de.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ ok: true, id: data?.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Contact endpoint error:', err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Unerwarteter Serverfehler. Bitte versucht es erneut oder schreibt an info@vinje.de.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
