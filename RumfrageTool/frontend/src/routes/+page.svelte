<script>
  import { env } from '$env/dynamic/public';

  /**
   * @typedef {Object} Props
   * @property {any} data - Daten aus dem Server-Side Rendering (+page.server.js)
   */

  /** @type {Props} */
  let { data } = $props();

  const API_URL = env.PUBLIC_API_URL || 'http://localhost:3000';

  // Reaktiver State (initialisiert mit den SSR-Daten)
  // Bewusst nur als Initialwert aus den SSR-Daten übernommen
  // svelte-ignore state_referenced_locally
  let user = $state(data.user);

  // svelte-ignore state_referenced_locally
  let surveys = $state(data.surveys || []);

  // Status- und Fehlermeldungen
  let errorMessage = $state('');
  let statusMessage = $state('');

  // State für Login / Registrierung
  let isRegisterMode = $state(false);
  let username = $state('');
  let password = $state('');
  // Steuert, ob das Auth-Formular (statt des ruhigen Hinweises) angezeigt wird
  let showAuthForm = $state(false);

  // State für "Neue Umfrage erstellen"
  let newTitle = $state('');
  let newOptionA = $state('');
  let newOptionB = $state('');

  // State für "Umfrage bearbeiten" (Inline-Edit)
  let editingId = $state(null);
  let editTitle = $state('');
  let editOptionA = $state('');
  let editOptionB = $state('');

  function clearMessages() {
    errorMessage = '';
    statusMessage = '';
  }

  // Öffnet das Auth-Formular im gewünschten Modus (vom Header oder Hinweis aus)
  function openAuth(register) {
    clearMessages();
    isRegisterMode = register;
    showAuthForm = true;
  }

  function closeAuth() {
    clearMessages();
    showAuthForm = false;
  }

  // --- 1. Authentifizierung (Login / Register / Logout) ---
  async function handleAuthSubmit() {
    clearMessages();
    const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // WICHTIG: Empfängt und speichert das HttpOnly-Cookie!
        body: JSON.stringify({ username, password })
      });

      const result = await res.json();
      if (!res.ok) {
        errorMessage = result.error || 'Anmeldung fehlgeschlagen.';
        return;
      }

      user = result.user;
      username = '';
      password = '';
      showAuthForm = false;
      statusMessage = isRegisterMode
        ? `Willkommen, ${user.username}! Dein Account wurde erstellt.`
        : `Willkommen zurück, ${user.username}!`;
    } catch (err) {
      errorMessage = 'Netzwerkfehler bei der Verbindung zum Server.';
    }
  }

  async function handleLogout() {
    clearMessages();
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      user = null;
      editingId = null;
      statusMessage = 'Du wurdest erfolgreich abgemeldet.';
    } catch (err) {
      errorMessage = 'Fehler beim Abmelden.';
    }
  }

  // --- 2. CRUD: Neue Umfrage anlegen (Create) ---
  async function handleCreateSurvey() {
    clearMessages();
    try {
      const res = await fetch(`${API_URL}/api/surveys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: newTitle,
          option_a: newOptionA,
          option_b: newOptionB
        })
      });

      const result = await res.json();
      if (!res.ok) {
        errorMessage = result.error || 'Umfrage konnte nicht erstellt werden.';
        return;
      }

      // Neue Umfrage inklusive Autorenname oben in die Liste einfügen
      surveys = [{ ...result, author: user.username }, ...surveys];
      newTitle = '';
      newOptionA = '';
      newOptionB = '';
      statusMessage = 'Umfrage erfolgreich veröffentlicht!';
    } catch (err) {
      errorMessage = 'Netzwerkfehler beim Erstellen der Umfrage.';
    }
  }

  // --- 3. CRUD: Umfrage bearbeiten (Update) ---
  function startEdit(survey) {
    clearMessages();
    editingId = survey.id;
    editTitle = survey.title;
    editOptionA = survey.option_a;
    editOptionB = survey.option_b;
  }

  function cancelEdit() {
    editingId = null;
  }

  async function saveEdit(surveyId) {
    clearMessages();
    try {
      const res = await fetch(`${API_URL}/api/surveys/${surveyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: editTitle,
          option_a: editOptionA,
          option_b: editOptionB
        })
      });

      const result = await res.json();
      if (!res.ok) {
        errorMessage = result.error || 'Änderung konnte nicht gespeichert werden.';
        return;
      }

      surveys = surveys.map((s) => (s.id === surveyId ? { ...s, ...result } : s));
      editingId = null;
      statusMessage = 'Umfrage erfolgreich aktualisiert.';
    } catch (err) {
      errorMessage = 'Netzwerkfehler beim Speichern.';
    }
  }

  // --- 4. CRUD: Abstimmen (Vote) ---
  async function handleVote(surveyId, option) {
    clearMessages();
    try {
      const res = await fetch(`${API_URL}/api/surveys/${surveyId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option })
      });

      const result = await res.json();
      if (!res.ok) {
        errorMessage = result.error || 'Abstimmung fehlgeschlagen.';
        return;
      }

      surveys = surveys.map((s) => (s.id === surveyId ? { ...s, ...result } : s));
    } catch (err) {
      errorMessage = 'Netzwerkfehler beim Abstimmen.';
    }
  }

  // --- 5. CRUD: Umfrage löschen (Delete) ---
  async function handleDelete(surveyId) {
    clearMessages();
    try {
      const res = await fetch(`${API_URL}/api/surveys/${surveyId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) {
        const result = await res.json();
        errorMessage = result.error || 'Löschen fehlgeschlagen.';
        return;
      }

      surveys = surveys.filter((s) => s.id !== surveyId);
      statusMessage = 'Umfrage wurde gelöscht.';
    } catch (err) {
      errorMessage = 'Netzwerkfehler beim Löschen.';
    }
  }

  // Hilfsfunktion zur Prozentberechnung für die Balkenanzeige
  function getPercent(votes, total) {
    if (total === 0) return 50;
    return Math.round((votes / total) * 100);
  }
</script>

<!-- Semantischer Header: Home-Navigation links, Benutzerstatus rechts -->
<header class="bg-indigo-900 text-white shadow-md">
  <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
    <!-- Logo + Titel: echter Link auf / (Startseite), tastaturbedienbar -->
    <a
      href="/"
      aria-label="PulsePoll &ndash; Zur Startseite"
      class="flex items-center gap-2 -ml-2 px-2 py-1 rounded-lg hover:bg-indigo-800 transition focus:outline-none focus:ring-2 focus:ring-white/80"
    >
      <span class="text-2xl" aria-hidden="true">📊</span>
      <span class="text-xl font-bold tracking-tight">PulsePoll</span>
    </a>

    <!-- Benutzer-/Login-Aktionen -->
    <nav class="flex items-center gap-2 sm:gap-3" aria-label="Benutzerkonto">
      {#if user}
        <span class="text-sm font-semibold text-white max-w-[8rem] truncate" title={user.username}>
          {user.username}
        </span>
        <button
          type="button"
          onclick={handleLogout}
          class="px-3 py-1.5 rounded-lg bg-indigo-800 hover:bg-indigo-700 text-white font-medium text-sm transition focus:outline-none focus:ring-2 focus:ring-white/80"
        >
          Abmelden
        </button>
      {:else}
        <button
          type="button"
          onclick={() => openAuth(false)}
          class="px-3 py-1.5 rounded-lg bg-indigo-800 hover:bg-indigo-700 text-white font-medium text-sm transition focus:outline-none focus:ring-2 focus:ring-white/80"
        >
          Anmelden
        </button>
        <button
          type="button"
          onclick={() => openAuth(true)}
          class="px-3 py-1.5 rounded-lg bg-white hover:bg-indigo-50 text-indigo-900 font-semibold text-sm transition focus:outline-none focus:ring-2 focus:ring-white/80"
        >
          Registrieren
        </button>
      {/if}
    </nav>
  </div>
</header>

<!-- Semantischer Hauptbereich (wächst dank flex-1 auf volle Höhe) -->
<main class="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:py-8">
  <!-- Hero: klarer, knapper Seiteneinstieg -->
  <div class="mb-8">
    <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900">
      Entweder-Oder-Umfragen
    </h1>
    <p class="mt-1 text-base text-slate-600">
      Stimme direkt ab oder erstelle deine eigene Umfrage.
    </p>
  </div>

<!-- Barrierefreie Status- und Fehlermeldungen (aria-live) -->
{#if errorMessage}
  <div
    role="alert"
    class="mb-6 p-4 rounded-lg bg-red-100 border border-red-400 text-red-900 font-medium"
  >
    {errorMessage}
  </div>
{/if}

{#if statusMessage}
  <div
    role="status"
    aria-live="polite"
    class="mb-6 p-4 rounded-lg bg-emerald-100 border border-emerald-400 text-emerald-950 font-medium"
  >
    {statusMessage}
  </div>
{/if}

<!-- BEREICH 1: Umfrage erstellen (eingeloggt) bzw. Anmelde-Hinweis / -Formular -->
<section class="mb-10">
  {#if user}
    <!-- Eingeloggt: ruhige, kompakte Box nur für die neue Umfrage (keine Accountinfos) -->
    <div class="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 class="text-xl font-bold text-slate-900 mb-4">Neue Umfrage</h2>

      <form onsubmit={(event) => { event.preventDefault(); handleCreateSurvey(); }} class="space-y-4">
        <div>
          <label for="new-title" class="block text-sm font-semibold text-slate-900 mb-1">
            Frage / Titel der Umfrage
          </label>
          <input
            id="new-title"
            type="text"
            bind:value={newTitle}
            required
            placeholder="z.B. Was grillen wir am Freitag?"
            class="w-full px-3.5 py-2.5 rounded-lg border border-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="new-opt-a" class="block text-sm font-semibold text-slate-900 mb-1">
              Antwort A
            </label>
            <input
              id="new-opt-a"
              type="text"
              bind:value={newOptionA}
              required
              placeholder="z.B. Klassische Bratwurst"
              class="w-full px-3.5 py-2.5 rounded-lg border border-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700"
            />
          </div>
          <div>
            <label for="new-opt-b" class="block text-sm font-semibold text-slate-900 mb-1">
              Antwort B
            </label>
            <input
              id="new-opt-b"
              type="text"
              bind:value={newOptionB}
              required
              placeholder="z.B. Grillkäse & Gemüse"
              class="w-full px-3.5 py-2.5 rounded-lg border border-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700"
            />
          </div>
        </div>

        <button
          type="submit"
          class="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-semibold transition focus:ring-2 focus:ring-offset-2 focus:ring-indigo-700"
        >
          Umfrage veröffentlichen
        </button>
      </form>
    </div>
  {:else if showAuthForm}
    <!-- Ausgeloggt + Anmelden angefordert: Auth-Formular (statt des Hinweises) -->
    <div class="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-slate-200">
      <div class="flex items-center justify-between gap-4 mb-4">
        <h2 class="text-xl font-bold text-slate-900">
          {isRegisterMode ? 'Registrieren' : 'Anmelden'}
        </h2>
        <button
          type="button"
          onclick={closeAuth}
          aria-label="Formular schließen"
          class="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-700"
        >
          Schließen
        </button>
      </div>

      <form onsubmit={(event) => { event.preventDefault(); handleAuthSubmit(); }} class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="auth-username" class="block text-sm font-semibold text-slate-900 mb-1">
              Benutzername
            </label>
            <input
              id="auth-username"
              type="text"
              bind:value={username}
              required
              minlength="3"
              placeholder="z.B. Lisa"
              class="w-full px-3.5 py-2.5 rounded-lg border border-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700"
            />
          </div>
          <div>
            <label for="auth-password" class="block text-sm font-semibold text-slate-900 mb-1">
              Passwort
            </label>
            <input
              id="auth-password"
              type="password"
              bind:value={password}
              required
              minlength="4"
              placeholder="Mindestens 4 Zeichen"
              class="w-full px-3.5 py-2.5 rounded-lg border border-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700"
            />
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            class="px-5 py-2.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-semibold transition focus:ring-2 focus:ring-offset-2 focus:ring-indigo-700"
          >
            {isRegisterMode ? 'Jetzt registrieren' : 'Einloggen'}
          </button>

          <button
            type="button"
            onclick={() => { isRegisterMode = !isRegisterMode; clearMessages(); }}
            class="text-sm font-medium text-indigo-700 hover:text-indigo-900 underline underline-offset-2 transition"
          >
            {isRegisterMode ? 'Stattdessen anmelden' : 'Noch keinen Account? Registrieren'}
          </button>
        </div>
      </form>
    </div>
  {:else}
    <!-- Ausgeloggt: ruhiger Hinweis statt großer Login-Maske -->
    <div class="bg-white p-5 sm:p-6 rounded-xl border border-dashed border-slate-300">
      <p class="text-slate-600">Melde dich an, um eigene Umfragen zu erstellen.</p>
      <button
        type="button"
        onclick={() => openAuth(false)}
        class="mt-3 px-5 py-2.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-semibold transition focus:ring-2 focus:ring-offset-2 focus:ring-indigo-700"
      >
        Anmelden
      </button>
    </div>
  {/if}
</section>

<!-- BEREICH 2: Liste aller Umfragen -->
<section aria-labelledby="surveys-heading">
  <h2 id="surveys-heading" class="text-xl sm:text-2xl font-bold text-slate-900 mb-4">
    Aktuelle Umfragen ({surveys.length})
  </h2>

  {#if surveys.length === 0}
    <p class="p-6 bg-white rounded-xl border border-slate-300 text-slate-700">
      Noch keine Umfragen vorhanden. Erstelle jetzt die erste Umfrage!
    </p>
  {:else}
    <div class="space-y-6">
      {#each surveys as survey (survey.id)}
        {@const totalVotes = survey.votes_a + survey.votes_b}
        {@const percentA = getPercent(survey.votes_a, totalVotes)}
        {@const percentB = 100 - percentA}

        <article class="bg-white p-5 sm:p-6 rounded-xl shadow-sm border border-slate-200">
          {#if editingId === survey.id}
            <!-- INLINE BEARBEITUNGS-MODUS (Update) -->
            <form onsubmit={(event) => { event.preventDefault(); saveEdit(survey.id); }} class="space-y-4">
              <h3 class="text-lg font-bold text-slate-900">Umfrage bearbeiten</h3>

              <div>
                <label
                  for="edit-title-{survey.id}"
                  class="block text-sm font-semibold text-slate-900 mb-1"
                >
                  Frage / Titel
                </label>
                <input
                  id="edit-title-{survey.id}"
                  type="text"
                  bind:value={editTitle}
                  required
                  class="w-full px-3.5 py-2 rounded-lg border border-slate-400 text-slate-900"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    for="edit-a-{survey.id}"
                    class="block text-sm font-semibold text-slate-900 mb-1"
                  >
                    Option A
                  </label>
                  <input
                    id="edit-a-{survey.id}"
                    type="text"
                    bind:value={editOptionA}
                    required
                    class="w-full px-3.5 py-2 rounded-lg border border-slate-400 text-slate-900"
                  />
                </div>
                <div>
                  <label
                    for="edit-b-{survey.id}"
                    class="block text-sm font-semibold text-slate-900 mb-1"
                  >
                    Option B
                  </label>
                  <input
                    id="edit-b-{survey.id}"
                    type="text"
                    bind:value={editOptionB}
                    required
                    class="w-full px-3.5 py-2 rounded-lg border border-slate-400 text-slate-900"
                  />
                </div>
              </div>

              <div class="flex flex-wrap gap-3">
                <button
                  type="submit"
                  class="px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-semibold text-sm"
                >
                  Änderungen speichern
                </button>
                <button
                  type="button"
                  onclick={cancelEdit}
                  class="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold text-sm"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          {:else}
            <!-- STANDARD ANZEIGE- & ABSTIMMUNGS-MODUS -->
            <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div class="min-w-0">
                <h3 class="text-lg sm:text-xl font-bold text-slate-900 break-words">{survey.title}</h3>
                <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Erstellt von <span class="font-semibold text-slate-700">{survey.author || 'Unbekannt'}</span>
                  &middot; {totalVotes} {totalVotes === 1 ? 'Stimme' : 'Stimmen'}
                </p>
              </div>

              {#if user}
                <div class="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onclick={() => startEdit(survey)}
                    class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs sm:text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-700"
                  >
                    Bearbeiten
                  </button>
                  <button
                    type="button"
                    onclick={() => handleDelete(survey.id)}
                    class="px-3 py-1.5 rounded-lg border border-red-300 bg-white hover:bg-red-50 text-red-700 font-medium text-xs sm:text-sm transition focus:outline-none focus:ring-2 focus:ring-red-600"
                  >
                    Löschen
                  </button>
                </div>
              {/if}
            </div>

            <!-- Abstimmungs-Buttons (Responsive Grid für Mobile & Desktop) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onclick={() => handleVote(survey.id, 'a')}
                class="flex items-center justify-between p-4 rounded-xl border-2 border-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-slate-900 font-semibold text-left transition focus:ring-2 focus:ring-indigo-700"
              >
                <span>A: {survey.option_a}</span>
                <span class="ml-2 px-2.5 py-1 rounded-md bg-indigo-800 text-white text-xs font-bold">
                  {survey.votes_a} ({percentA}%)
                </span>
              </button>

              <button
                type="button"
                onclick={() => handleVote(survey.id, 'b')}
                class="flex items-center justify-between p-4 rounded-xl border-2 border-teal-700 bg-teal-50 hover:bg-teal-100 text-slate-900 font-semibold text-left transition focus:ring-2 focus:ring-teal-700"
              >
                <span>B: {survey.option_b}</span>
                <span class="ml-2 px-2.5 py-1 rounded-md bg-teal-800 text-white text-xs font-bold">
                  {survey.votes_b} ({percentB}%)
                </span>
              </button>
            </div>

            <!-- Visueller Ergebnis-Balken -->
            <div
              class="w-full h-3 rounded-full overflow-hidden flex bg-slate-200"
              aria-hidden="true"
            >
              <div style="width: {percentA}%" class="bg-indigo-700 transition-all duration-300"></div>
              <div style="width: {percentB}%" class="bg-teal-700 transition-all duration-300"></div>
            </div>
          {/if}
        </article>
      {/each}
    </div>
  {/if}
</section>
</main>