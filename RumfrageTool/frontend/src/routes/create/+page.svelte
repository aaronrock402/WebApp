<script>
  import { goto, invalidateAll } from '$app/navigation';
  import { API_URL } from '$lib/api.js';
  import Alert from '$lib/Alert.svelte';

  let title = $state('');
  let optionA = $state('');
  let optionB = $state('');
  let fileName = $state('');

  let errorMessage = $state('');
  let statusMessage = $state('');

  // Merkt sich die gerade angelegte Umfrage-ID. Falls das (optionale) Anhängen
  // einer Datei scheitert, wird so beim erneuten Absenden NICHT doppelt erstellt,
  // sondern nur der Upload wiederholt.
  let createdId = $state(null);

  function onFileChange(event) {
    const file = event.currentTarget.files?.[0];
    fileName = file ? file.name : '';
  }

  // --- Umfrage erstellen (+ optionaler Datei-Upload) ---
  // Verwendet exakt die bestehenden Endpunkte:
  //   POST /api/surveys            (anlegen)
  //   POST /api/surveys/:id/upload (Datei anhängen – unverändertes Upload-Verfahren)
  async function handleCreate(form) {
    errorMessage = '';
    statusMessage = '';

    // 1. Umfrage anlegen (nur falls noch nicht geschehen)
    if (createdId === null) {
      try {
        const res = await fetch(`${API_URL}/api/surveys`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ title, option_a: optionA, option_b: optionB })
        });

        const result = await res.json();
        if (!res.ok) {
          errorMessage = result.error || 'Umfrage konnte nicht erstellt werden.';
          return;
        }
        createdId = result.id;
      } catch (err) {
        errorMessage = 'Netzwerkfehler beim Erstellen der Umfrage.';
        return;
      }
    }

    // 2. Optional: ausgewählte Datei an die neue Umfrage anhängen
    const fileInput = form.querySelector('input[type=file]');
    const file = fileInput?.files?.[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch(`${API_URL}/api/surveys/${createdId}/upload`, {
          method: 'POST',
          credentials: 'include',
          body: formData
        });
        if (!res.ok) {
          const result = await res.json();
          // Umfrage existiert bereits – nur der Anhang schlug fehl.
          errorMessage = (result.error || 'Upload fehlgeschlagen.') +
            ' Die Umfrage wurde bereits erstellt – du kannst die Datei auf der Übersicht erneut anhängen.';
          return;
        }
      } catch (err) {
        errorMessage = 'Netzwerkfehler beim Hochladen. Die Umfrage wurde bereits erstellt.';
        return;
      }
    }

    // 3. Erfolgreich – Daten neu laden und zurück zum Dashboard
    await invalidateAll();
    await goto('/');
  }
</script>

<div class="mx-auto w-full max-w-2xl py-2">
  <!-- Kopf mit Zurück-Link -->
  <div class="mb-6">
    <a href="/" class="text-sm text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline">← Zurück zur Übersicht</a>
    <h1 class="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Neue Umfrage</h1>
    <p class="mt-1 text-sm text-slate-600">Stelle eine Entweder-Oder-Frage mit zwei Antwortmöglichkeiten.</p>
  </div>

  <Alert error={errorMessage} status={statusMessage} />

  <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
    <form onsubmit={(event) => { event.preventDefault(); handleCreate(event.currentTarget); }} class="space-y-5">
      <div>
        <label for="create-title" class="mb-1 block text-sm font-semibold text-slate-900">
          Frage / Titel der Umfrage
        </label>
        <input
          id="create-title"
          type="text"
          bind:value={title}
          required
          placeholder="z.B. Was grillen wir am Freitag?"
          class="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700"
        />
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label for="create-opt-a" class="mb-1 block text-sm font-semibold text-slate-900">
            Antwort A
          </label>
          <input
            id="create-opt-a"
            type="text"
            bind:value={optionA}
            required
            placeholder="z.B. Klassische Bratwurst"
            class="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700"
          />
        </div>
        <div>
          <label for="create-opt-b" class="mb-1 block text-sm font-semibold text-slate-900">
            Antwort B
          </label>
          <input
            id="create-opt-b"
            type="text"
            bind:value={optionB}
            required
            placeholder="z.B. Grillkäse & Gemüse"
            class="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700"
          />
        </div>
      </div>

      <!-- Optionaler Datei-Anhang: klar abgegrenzte Upload-Zone -->
      <div>
        <span class="mb-1 block text-sm font-semibold text-slate-900">Datei anhängen <span class="font-normal text-slate-400">(optional)</span></span>
        <label
          for="create-file"
          class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"
        >
          <span class="text-2xl" aria-hidden="true">📎</span>
          <span class="text-sm font-medium text-slate-700">
            {fileName || 'Datei auswählen'}
          </span>
          <span class="text-xs text-slate-400">PDF, JPG oder PNG · max. 10 MB</span>
          <input
            id="create-file"
            type="file"
            name="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onchange={onFileChange}
            class="sr-only"
          />
        </label>
        <p class="mt-1.5 text-xs text-slate-400">Angehängte Dateien werden beim Upload automatisch auf Viren geprüft.</p>
      </div>

      <div class="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          class="rounded-lg bg-indigo-700 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:ring-offset-2"
        >
          Umfrage erstellen
        </button>
        <a
          href="/"
          class="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700"
        >
          Abbrechen
        </a>
      </div>
    </form>
  </div>
</div>
