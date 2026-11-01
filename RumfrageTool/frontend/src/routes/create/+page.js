import { redirect } from '@sveltejs/kit';

/**
 * Zugriffs-Schutz für /create: Nur eingeloggte Nutzer dürfen eine Umfrage
 * erstellen. Der Login-Status stammt aus dem Layout-Load (+layout.server.js);
 * bei fehlendem Login wird auf die Login-Seite umgeleitet.
 *
 * Reiner Frontend-Guard – es wird KEIN neuer Endpunkt aufgerufen.
 *
 * @type {import('./$types').PageLoad}
 */
export async function load({ parent }) {
  const { user } = await parent();
  if (!user) {
    throw redirect(302, '/login');
  }
  return {};
}
