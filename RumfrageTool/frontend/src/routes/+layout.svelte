<script>
  import '../app.css';
  import { page } from '$app/stores';
  import { goto, invalidateAll } from '$app/navigation';
  import { API_URL } from '$lib/api.js';

  /**
   * @typedef {Object} Props
   * @property {any} data - Layout-Daten aus +layout.server.js (user, surveys)
   * @property {import('svelte').Snippet} [children]
   */

  /** @type {Props} */
  let { data, children } = $props();

  // Login-Status und Umfrage-Anzahl kommen serverseitig aus +layout.server.js.
  // $derived sorgt dafür, dass die Sidebar nach Login/Logout/Navigation
  // automatisch den aktuellen Stand zeigt (nach invalidateAll).
  let user = $derived(data.user);
  let surveyCount = $derived((data.surveys || []).length);

  // Aktueller Pfad – für die Hervorhebung des aktiven Navigationspunktes.
  let path = $derived($page.url.pathname);

  // Reiner UI-State: steuert den einklappbaren Drawer auf kleinen Bildschirmen.
  let sidebarOpen = $state(false);

  function closeSidebar() {
    sidebarOpen = false;
  }

  // --- Logout: unveränderter Endpunkt + Cookie-Verfahren ---
  // Nach dem Abmelden werden die Server-Loads neu ausgeführt (invalidateAll),
  // damit user wieder null ist, und wir landen auf dem Dashboard.
  async function handleLogout() {
    closeSidebar();
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      // Fehler beim Abmelden bewusst still – der Nutzer wird trotzdem ausgeloggt dargestellt.
    }
    await invalidateAll();
    await goto('/');
  }

  // Einheitliche Klassen für einen Navigationspunkt (aktiv / inaktiv).
  function navClass(active) {
    return active
      ? 'flex w-full items-center gap-3 rounded-lg bg-indigo-50 px-3 py-2.5 font-semibold text-indigo-700'
      : 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900';
  }
</script>

<!-- Äußere Hülle: Footer bleibt dank flex-col immer unten -->
<div class="flex min-h-screen flex-col bg-slate-50 text-slate-900">
  <!-- Mobile Kopfzeile: nur unterhalb von lg sichtbar (Logo + Menü-Button) -->
  <header
    class="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden"
  >
    <a
      href="/"
      aria-label="Umfrageheld – Zur Startseite"
      class="flex items-center gap-2 rounded-md px-1 py-0.5 text-slate-900 transition hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-700"
    >
      <span class="text-xl" aria-hidden="true">📊</span>
      <span class="text-lg font-bold tracking-tight">Umfrageheld</span>
    </a>

    <button
      type="button"
      onclick={() => (sidebarOpen = true)}
      aria-label="Menü öffnen"
      aria-expanded={sidebarOpen}
      class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-700"
    >
      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
      Menü
    </button>
  </header>

  <!-- Abdunklung hinter dem mobilen Drawer (schließt die Sidebar bei Klick) -->
  {#if sidebarOpen}
    <button
      type="button"
      onclick={closeSidebar}
      aria-label="Menü schließen"
      class="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
    ></button>
  {/if}

  <!-- Dashboard-Grundgerüst: Sidebar + Hauptbereich nebeneinander ab lg -->
  <div class="flex flex-1">
    <!--
      Sidebar: auf dem Desktop fest links (sticky, volle Höhe),
      auf kleinen Bildschirmen als von links einschiebbarer Drawer.
    -->
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] transform flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:max-w-none lg:translate-x-0 {sidebarOpen ? 'translate-x-0' : '-translate-x-full'}"
      aria-label="Hauptnavigation"
    >
      <!-- Kopf der Sidebar: Logo + Schließen-Button (nur mobil) -->
      <div class="flex items-center justify-between gap-2 px-5 py-5">
        <a
          href="/"
          onclick={closeSidebar}
          aria-label="Umfrageheld – Zur Startseite"
          class="flex items-center gap-2 rounded-md px-1 py-0.5 text-slate-900 transition hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-700"
        >
          <span class="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 text-lg text-white shadow-sm" aria-hidden="true">📊</span>
          <span class="text-lg font-bold tracking-tight">Umfrageheld</span>
        </a>
        <button
          type="button"
          onclick={closeSidebar}
          aria-label="Menü schließen"
          class="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700 lg:hidden"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>
      </div>

      <!-- Navigation: ausschließlich tatsächlich vorhandene Funktionen -->
      <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-2 text-sm">
        <a href="/" onclick={closeSidebar} class={navClass(path === '/')}>
          <span class="text-base" aria-hidden="true">🏠</span>
          Übersicht
        </a>
        <a href="/surveys" onclick={closeSidebar} class={navClass(path === '/surveys')}>
          <span class="text-base" aria-hidden="true">📊</span>
          Umfragen
          <span class="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{surveyCount}</span>
        </a>
        {#if user}
          <a href="/create" onclick={closeSidebar} class={navClass(path === '/create')}>
            <span class="text-base" aria-hidden="true">➕</span>
            Neue Umfrage
          </a>
        {/if}
      </nav>

      <!-- Fuß der Sidebar: Benutzerbereich (Login/Logout) -->
      <div class="border-t border-slate-200 px-3 py-4">
        {#if user}
          <div class="flex items-center gap-3 px-2">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700" aria-hidden="true">
              {user.username.charAt(0).toUpperCase()}
            </span>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-900" title={user.username}>{user.username}</p>
              <p class="text-xs text-slate-500">Angemeldet</p>
            </div>
          </div>
          <button
            type="button"
            onclick={handleLogout}
            class="mt-3 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700"
          >
            Abmelden
          </button>
        {:else}
          <div class="space-y-2">
            <a
              href="/login"
              onclick={closeSidebar}
              class="block w-full rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-700"
            >
              Anmelden
            </a>
            <a
              href="/register"
              onclick={closeSidebar}
              class="block w-full rounded-lg bg-indigo-700 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-700"
            >
              Registrieren
            </a>
          </div>
        {/if}
      </div>
    </aside>

    <!-- Semantischer Hauptbereich – Inhalt kommt aus der jeweiligen Seite -->
    <main class="min-w-0 flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <div class="mx-auto w-full max-w-4xl">
        {@render children?.()}
      </div>
    </main>
  </div>

  <!-- Semantischer Footer: dezenter technischer Hinweis statt Navigation -->
  <footer class="mt-auto border-t border-slate-200 py-5">
    <div class="mx-auto max-w-3xl space-y-1 px-4 text-center">
      <p class="text-xs text-slate-500">Web-Programmierung Projekt – Barrierefreies A/B-Umfragetool</p>
      <p class="text-xs text-slate-400">SSR · Express · RabbitMQ</p>
    </div>
  </footer>
</div>
