import { env } from '$env/dynamic/public';

// Zentrale Basis-URL für alle Browser-seitigen Fetch-Aufrufe an das Backend.
// Bewusst an EINER Stelle definiert, damit alle Seiten (Dashboard, Login,
// Registrierung, Erstellen) exakt denselben Endpunkt verwenden.
export const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';
