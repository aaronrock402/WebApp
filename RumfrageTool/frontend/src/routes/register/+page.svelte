<script>
  import { goto, invalidateAll } from '$app/navigation';
  import { API_URL } from '$lib/api.js';
  import Alert from '$lib/Alert.svelte';

  let username = $state('');
  let password = $state('');
  let errorMessage = $state('');

  // --- Registrierung: exakt der bestehende Endpunkt + Cookie-Authentifizierung ---
  async function handleRegister() {
    errorMessage = '';
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // WICHTIG: Empfängt und speichert das HttpOnly-Cookie!
        body: JSON.stringify({ username, password })
      });

      const result = await res.json();
      if (!res.ok) {
        errorMessage = result.error || 'Registrierung fehlgeschlagen.';
        return;
      }

      // Server-Loads neu ausführen, damit der Login-Status überall aktuell ist,
      // dann zurück zum Dashboard.
      await invalidateAll();
      await goto('/');
    } catch (err) {
      errorMessage = 'Netzwerkfehler bei der Verbindung zum Server.';
    }
  }
</script>

<div class="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center py-6">
  <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <!-- Logo / Umfrage-Tool -->
    <div class="mb-6 flex flex-col items-center text-center">
      <span class="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-indigo-600 text-2xl text-white shadow-sm" aria-hidden="true">📊</span>
      <h1 class="text-2xl font-extrabold tracking-tight text-slate-900">Konto erstellen</h1>
      <p class="mt-1 text-sm text-slate-500">Erstelle in wenigen Sekunden deinen Umfrageheld-Account.</p>
    </div>

    <Alert error={errorMessage} />

    <form onsubmit={(event) => { event.preventDefault(); handleRegister(); }} class="space-y-4">
      <div>
        <label for="register-username" class="mb-1 block text-sm font-semibold text-slate-900">
          Benutzername
        </label>
        <input
          id="register-username"
          type="text"
          bind:value={username}
          required
          minlength="3"
          autocomplete="username"
          placeholder="z.B. Lisa"
          class="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700"
        />
      </div>
      <div>
        <label for="register-password" class="mb-1 block text-sm font-semibold text-slate-900">
          Passwort
        </label>
        <input
          id="register-password"
          type="password"
          bind:value={password}
          required
          minlength="4"
          autocomplete="new-password"
          placeholder="Mindestens 4 Zeichen"
          class="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700"
        />
      </div>

      <button
        type="submit"
        class="w-full rounded-lg bg-indigo-700 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:ring-offset-2"
      >
        Jetzt registrieren
      </button>
    </form>

    <div class="mt-6 space-y-2 text-center text-sm">
      <p class="text-slate-600">
        Bereits registriert?
        <a href="/login" class="font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-900">Anmelden</a>
      </p>
      <p>
        <a href="/" class="text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline">← Zurück zur Übersicht</a>
      </p>
    </div>
  </div>
</div>
