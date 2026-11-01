<script>
  import SurveyList from '$lib/SurveyList.svelte';

  /**
   * @typedef {Object} Props
   * @property {any} data - Daten aus dem Layout-Load (+layout.server.js): user, surveys
   */

  /** @type {Props} */
  let { data } = $props();

  // Login-Status steuert Bearbeiten/Löschen/Upload in den Karten.
  let user = $derived(data.user);

  // ALLE Umfragen aus dem bestehenden GET /api/surveys. Eigener $state, damit
  // Abstimmen/Löschen/Upload (in SurveyList) direkt wirken.
  // svelte-ignore state_referenced_locally
  let surveys = $state(data.surveys || []);
</script>

<section class="mb-8">
  <h1 class="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
    Alle Umfragen
  </h1>
  <p class="mt-2 text-base text-slate-600">
    Sieh dir alle Umfragen an, stimme ab und verwalte Umfragen.
  </p>
</section>

<section aria-labelledby="all-surveys-heading">
  <h2 id="all-surveys-heading" class="mb-5 text-lg font-bold text-slate-900">
    Umfragen
    <span class="font-normal text-slate-400">({surveys.length})</span>
  </h2>

  <SurveyList bind:surveys {user}>
    {#snippet empty()}
      <div class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p class="text-base font-medium text-slate-700">Noch keine Umfragen vorhanden.</p>
        {#if user}
          <a
            href="/create"
            class="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:ring-offset-2"
          >
            <span aria-hidden="true" class="text-lg leading-none">+</span>
            Erste Umfrage erstellen
          </a>
        {:else}
          <p class="mt-1 text-sm text-slate-500">
            Melde dich an, um selbst Umfragen zu erstellen.
          </p>
        {/if}
      </div>
    {/snippet}
  </SurveyList>
</section>
