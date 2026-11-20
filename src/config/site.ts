export const SITE_CONFIG = {
  // Eure Calendly-URL (kann jederzeit hier oder über PUBLIC_CALENDLY_URL in der .env angepasst werden)
  calendlyUrl:
    import.meta.env.PUBLIC_CALENDLY_URL ||
    'https://calendly.com/jesse-bakenhus/20min',
};

/**
 * Erzeugt die offizielle Calendly-Inline-Embed-URL inklusive embed_type=Inline
 * und den vinje-Markenfarben (Paper #F7F6F2 & Ink #141414).
 */
export function getStyledCalendlyUrl(baseUrl = SITE_CONFIG.calendlyUrl): string {
  const cleanUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
  const separator = cleanUrl.includes('?') ? '&' : '?';
  return `${cleanUrl}${separator}embed_type=Inline&hide_gdpr_banner=1&background_color=f7f6f2&text_color=141414&primary_color=141414`;
}
