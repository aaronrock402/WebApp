import { env } from '$env/dynamic/private';

const INTERNAL_API_URL = env.INTERNAL_API_URL || 'http://backend-api:3000';

/**
 * Lädt den eingeloggten Benutzer UND alle Umfragen serverseitig.
 *
 * Bewusst im Layout (statt pro Seite), damit die Sidebar auf JEDER Route den
 * Login-Status und die Umfrage-Anzahl kennt. Die Dashboard-Seite greift über
 * `data.surveys` auf dieselben Daten zu (Layout-Daten werden in Page-Daten
 * zusammengeführt).
 *
 * Endpunkte und Cookie-Weiterleitung sind unverändert gegenüber der bisherigen
 * +page.server.js.
 *
 * @type {import('./$types').LayoutServerLoad}
 */
export async function load({ fetch, request }) {
  // Liest das HttpOnly-Cookie aus dem Browser-Request aus, um es an Express weiterzuleiten
  const cookieHeader = request.headers.get('cookie') || '';

  try {
    // Parallel (gleichzeitig) den eingeloggten User und alle Umfragen vom Backend laden
    const [meRes, surveysRes] = await Promise.all([
      fetch(`${INTERNAL_API_URL}/api/auth/me`, {
        headers: { cookie: cookieHeader }
      }),
      fetch(`${INTERNAL_API_URL}/api/surveys`)
    ]);

    const meData = meRes.ok ? await meRes.json() : { user: null };
    const surveys = surveysRes.ok ? await surveysRes.json() : [];

    return {
      user: meData.user,
      surveys
    };
  } catch (error) {
    console.error('[SSR] Fehler beim Laden der Daten vom Backend:', error.message);
    return {
      user: null,
      surveys: []
    };
  }
}
