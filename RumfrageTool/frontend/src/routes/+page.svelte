<script>
  import SurveyList from '$lib/SurveyList.svelte';

  /**
   * @typedef {Object} Props
   * @property {any} data - Daten aus dem Layout-Load (+layout.server.js): user, surveys
   */

  /** @type {Props} */
  let { data } = $props();

  // Login-Status kommt reaktiv aus den Layout-Daten (Server-Wahrheit via Cookie).
  let user = $derived(data.user);

  // "Meine Umfragen": rein frontendseitig aus den bereits geladenen Umfragen
  // (GET /api/surveys) nach dem vorhandenen Autor-Feld gefiltert. Kein neuer
  // Endpunkt. Eigener $state, damit Abstimmen/Löschen (in SurveyList) hier
  // direkt wirken und die Kennzahlen reaktiv aktualisieren.
  // svelte-ignore state_referenced_locally
  let mySurveys = $state(
    data.user ? (data.surveys || []).filter((s) => s.author === data.user.username) : []
  );

  // Kleine Dashboard-Kennzahlen – ausschließlich aus den eigenen Umfragen abgeleitet.
  let myVotes = $derived(
    mySurveys.reduce((sum, s) => sum + (s.votes_a || 0) + (s.votes_b || 0), 0)
  );
  let myFiles = $derived(
    mySurveys.reduce((sum, s) => sum + ((s.files || []).length), 0)
  );
</script>

{#if user}
  <!-- ANGEMELDET: persönlicher Überblick -->
  <section class="mb-8">
    <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
      Hallo, {user.username}
    </h1>
    <p class="mt-2 text-base text-slate-600">
      Hier findest du deine Umfragen auf einen Blick.
    </p>
  </section>

  <!-- Wenige Kennzahlen, nur aus den eigenen Umfragen berechnet -->
  <section aria-label="Deine Kennzahlen" class="mb-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Meine Umfragen</p>
      <p class="mt-1 text-2xl font-bold text-slate-900">{mySurveys.length}</p>
    </div>
    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Stimmen gesamt</p>
      <p class="mt-1 text-2xl font-bold text-slate-900">{myVotes}</p>
    </div>
    <div class="col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-1">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Meine Dateien</p>
      <p class="mt-1 text-2xl font-bold text-slate-900">{myFiles}</p>
    </div>
  </section>

  <!-- Meine Umfragen -->
  <section aria-labelledby="my-surveys-heading">
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 id="my-surveys-heading" class="text-lg font-bold text-slate-900">
        Meine Umfragen
        <span class="font-normal text-slate-400">({mySurveys.length})</span>
      </h2>
      <a
        href="/create"
        class="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:ring-offset-2"
      >
        <span aria-hidden="true" class="text-base leading-none">+</span>
        Neue Umfrage
      </a>
    </div>

    <SurveyList bind:surveys={mySurveys} {user}>
      {#snippet empty()}
        <div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p class="text-base font-medium text-slate-700">Du hast noch keine eigene Umfrage erstellt.</p>
          <p class="mt-1 text-sm text-slate-500">Starte jetzt mit deiner ersten Entweder-Oder-Frage.</p>
          <a
            href="/create"
            class="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:ring-offset-2"
          >
            <span aria-hidden="true" class="text-lg leading-none">+</span>
            Erste Umfrage erstellen
          </a>
        </div>
      {/snippet}
    </SurveyList>
  </section>
{:else}
  <!-- NICHT ANGEMELDET: Begrüßung ohne persönliche Statistiken -->
  <section class="mx-auto max-w-2xl py-6 text-center sm:py-10">
    <span class="grid mx-auto h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-2xl text-white shadow-sm" aria-hidden="true">📊</span>
    <h1 class="mt-5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
      Willkommen bei Umfrageheld
    </h1>
    <p class="mx-auto mt-3 max-w-xl text-base text-slate-600">
      Dein Umfrageheld für einfache Entweder-Oder-Fragen: Umfragen ansehen, abstimmen
      und – nach dem Anmelden – eigene Umfragen erstellen.
    </p>

    <div class="mt-7 flex flex-wrap items-center justify-center gap-3">
      <a
        href="/surveys"
        class="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:ring-offset-2"
      >
        Umfragen ansehen
      </a>
      <a
        href="/login"
        class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700"
      >
        Anmelden
      </a>
      <a
        href="/register"
        class="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 font-medium text-indigo-700 underline-offset-2 transition hover:text-indigo-900 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-700"
      >
        Registrieren
      </a>
    </div>
  </section>
{/if}
