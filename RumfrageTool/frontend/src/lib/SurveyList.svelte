<script>
  /**
   * Wiederverwendbare Umfragen-Liste.
   *
   * Enthält die komplette Umfragekarten-Logik (Anzeigen, Abstimmen, Bearbeiten,
   * Löschen, Datei-Upload, Anhänge) EINMAL, damit sie sowohl im Dashboard (/)
   * unter "Meine Umfragen" als auch auf "Alle Umfragen" (/surveys) ohne
   * Copy/Paste genutzt werden kann.
   *
   * Es werden ausschließlich die bereits vorhandenen Backend-Endpunkte
   * verwendet – keine neuen Verträge, keine neuen Felder.
   *
   * @typedef {Object} Props
   * @property {any[]} surveys  Anzuzeigende Umfragen ($bindable: Abstimmen/Löschen
   *                            wirken direkt auf die vom Elternteil gehaltene Liste,
   *                            damit z. B. Dashboard-Kennzahlen reaktiv bleiben).
   * @property {any} user       Eingeloggter Nutzer (oder null). Steuert, ob
   *                            Bearbeiten/Löschen/Upload sichtbar sind.
   * @property {import('svelte').Snippet} [empty]  Optionaler Inhalt für den
   *                            Leerzustand (sonst Standardtext).
   */

  import { invalidateAll } from '$app/navigation';
  import { API_URL } from '$lib/api.js';
  import Alert from '$lib/Alert.svelte';

  /** @type {Props} */
  let { surveys = $bindable([]), user, empty } = $props();

  // Status- und Fehlermeldungen (pro Liste eigenständig)
  let errorMessage = $state('');
  let statusMessage = $state('');

  // State für "Umfrage bearbeiten" (Inline-Edit innerhalb der Karte)
  let editingId = $state(null);
  let editTitle = $state('');
  let editOptionA = $state('');
  let editOptionB = $state('');

  function clearMessages() {
    errorMessage = '';
    statusMessage = '';
  }

  // --- Umfrage bearbeiten (Update) ---
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
      // Zentrale Layout-Daten (user, surveys) neu laden, damit Dashboard,
      // Sidebar-Zähler und /surveys beim Routenwechsel denselben Stand zeigen.
      invalidateAll();
    } catch (err) {
      errorMessage = 'Netzwerkfehler beim Speichern.';
    }
  }

  // --- Abstimmen (Vote) ---
  async function handleVote(surveyId, option) {
    clearMessages();
    try {
      const res = await fetch(`${API_URL}/api/surveys/${surveyId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Cookies (voter_id / Auth-Token) mitsenden
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
      return;
    }
    // Zentrale Layout-Daten neu laden (siehe saveEdit).
    invalidateAll();
  }

  // --- Umfrage löschen (Delete) ---
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
      invalidateAll();
    } catch (err) {
      errorMessage = 'Netzwerkfehler beim Löschen.';
    }
  }

  // --- Datei-Upload für eine Umfrage ---
  async function handleUpload(surveyId, form) {
    clearMessages();
    const fileInput = form.querySelector('input[type=file]');
    const file = fileInput?.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/api/surveys/${surveyId}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData
        // Kein Content-Type Header – Browser setzt ihn inkl. Boundary automatisch
      });

      const result = await res.json();
      if (!res.ok) {
        errorMessage = result.error || 'Upload fehlgeschlagen.';
        return;
      }

      // Neue Datei reaktiv in die Umfrage eintragen
      surveys = surveys.map((s) =>
        s.id === surveyId
          ? {
              ...s,
              files: [
                { id: result.id, original_name: result.original_name, mime_type: result.mime_type, uploaded_at: result.uploaded_at },
                ...(s.files || [])
              ]
            }
          : s
      );
      fileInput.value = '';
      statusMessage = 'Datei erfolgreich hochgeladen und auf Viren geprüft!';
      invalidateAll();
    } catch (err) {
      errorMessage = 'Netzwerkfehler beim Hochladen.';
    }
  }

  // Hilfsfunktion zur Prozentberechnung für die Balkenanzeige
  function getPercent(votes, total) {
    if (total === 0) return 50;
    return Math.round((votes / total) * 100);
  }
</script>

<!-- Status- und Fehlermeldungen -->
<Alert error={errorMessage} status={statusMessage} />

{#if surveys.length === 0}
  {#if empty}
    {@render empty()}
  {:else}
    <div class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p class="text-slate-500">Noch keine Umfragen vorhanden.</p>
    </div>
  {/if}
{:else}
  <div class="space-y-4">
    {#each surveys as survey (survey.id)}
      {@const totalVotes = survey.votes_a + survey.votes_b}
      {@const percentA = getPercent(survey.votes_a, totalVotes)}
      {@const percentB = 100 - percentA}

      <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
        {#if editingId === survey.id}
          <!-- INLINE BEARBEITUNGS-MODUS (Update) -->
          <form onsubmit={(event) => { event.preventDefault(); saveEdit(survey.id); }} class="space-y-4">
            <h3 class="text-base font-bold text-slate-900">Umfrage bearbeiten</h3>

            <div>
              <label for="edit-title-{survey.id}" class="mb-1 block text-sm font-semibold text-slate-900">
                Frage / Titel
              </label>
              <input
                id="edit-title-{survey.id}"
                type="text"
                bind:value={editTitle}
                required
                class="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700"
              />
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="edit-a-{survey.id}" class="mb-1 block text-sm font-semibold text-slate-900">
                  Option A
                </label>
                <input
                  id="edit-a-{survey.id}"
                  type="text"
                  bind:value={editOptionA}
                  required
                  class="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700"
                />
              </div>
              <div>
                <label for="edit-b-{survey.id}" class="mb-1 block text-sm font-semibold text-slate-900">
                  Option B
                </label>
                <input
                  id="edit-b-{survey.id}"
                  type="text"
                  bind:value={editOptionB}
                  required
                  class="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700"
                />
              </div>
            </div>

            <div class="flex flex-wrap gap-3">
              <button
                type="submit"
                class="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:ring-offset-2"
              >
                Änderungen speichern
              </button>
              <button
                type="button"
                onclick={cancelEdit}
                class="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700"
              >
                Abbrechen
              </button>
            </div>
          </form>
        {:else}
          <!-- STANDARD ANZEIGE- & ABSTIMMUNGS-MODUS -->
          <div class="flex items-start justify-between gap-3">
            <h3 class="min-w-0 break-words text-base font-bold text-slate-900 sm:text-lg">
              {survey.title}
            </h3>

            {#if user}
              <div class="-mr-1 -mt-1 flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onclick={() => startEdit(survey)}
                  class="rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700"
                >
                  Bearbeiten
                </button>
                <button
                  type="button"
                  onclick={() => handleDelete(survey.id)}
                  class="rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  Löschen
                </button>
              </div>
            {/if}
          </div>

          <p class="mt-1 text-xs text-slate-500">
            {survey.author || 'Unbekannt'}
            · {totalVotes} {totalVotes === 1 ? 'Stimme' : 'Stimmen'}
          </p>

          <!-- Abstimmungs-Buttons (mobil untereinander, ab sm nebeneinander) -->
          <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onclick={() => handleVote(survey.id, 'a')}
              class="flex items-center justify-between gap-2 rounded-lg border border-slate-300 px-4 py-3 text-left font-medium text-slate-900 transition hover:border-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-700"
            >
              <span class="min-w-0 break-words">{survey.option_a}</span>
              <span class="shrink-0 text-xs font-semibold text-indigo-700">{percentA}%</span>
            </button>

            <button
              type="button"
              onclick={() => handleVote(survey.id, 'b')}
              class="flex items-center justify-between gap-2 rounded-lg border border-slate-300 px-4 py-3 text-left font-medium text-slate-900 transition hover:border-teal-700 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              <span class="min-w-0 break-words">{survey.option_b}</span>
              <span class="shrink-0 text-xs font-semibold text-teal-700">{percentB}%</span>
            </button>
          </div>

          <!-- Visueller Ergebnis-Balken -->
          <div class="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <div style="width: {percentA}%" class="bg-indigo-600 transition-all duration-300"></div>
            <div style="width: {percentB}%" class="bg-teal-600 transition-all duration-300"></div>
          </div>

          <!-- Angehängte Dateien anzeigen -->
          {#if survey.files && survey.files.length > 0}
            <div class="mt-5 border-t border-slate-100 pt-4">
              <h4 class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Angehängte Dateien ({survey.files.length})
              </h4>
              <ul class="space-y-2">
                {#each survey.files as file (file.id)}
                  <li class="flex items-center gap-3">
                    {#if file.mime_type === 'image/jpeg' || file.mime_type === 'image/png'}
                      <img
                        src="{API_URL}/api/files/{file.id}"
                        alt={file.original_name}
                        class="h-14 w-14 shrink-0 rounded-md border border-slate-200 object-cover"
                      />
                    {:else}
                      <span class="shrink-0 text-2xl" aria-hidden="true">📄</span>
                    {/if}
                    <a
                      href="{API_URL}/api/files/{file.id}"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="min-w-0 truncate text-sm text-indigo-700 underline-offset-2 hover:text-indigo-900 hover:underline"
                    >
                      {file.original_name}
                    </a>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          <!-- Datei-Upload (nur für eingeloggte Nutzer) -->
          {#if user}
            <div class="mt-5 border-t border-slate-100 pt-4">
              <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Datei anhängen
              </h4>
              <form
                onsubmit={(e) => { e.preventDefault(); handleUpload(survey.id, e.currentTarget); }}
                class="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3"
              >
                <input
                  type="file"
                  name="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  required
                  aria-label="Datei für diese Umfrage hochladen (PDF, JPG, PNG)"
                  class="min-w-0 flex-1 cursor-pointer text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <button
                  type="submit"
                  class="shrink-0 rounded-md bg-indigo-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:ring-offset-2"
                >
                  Hochladen
                </button>
              </form>
              <p class="mt-1.5 text-xs text-slate-400">
                Erlaubt: PDF, JPG, PNG · max. 10 MB · Dateien werden beim Upload auf Viren geprüft.
              </p>
            </div>
          {/if}
        {/if}
      </article>
    {/each}
  </div>
{/if}
