<script>
  /**
   * Wiederverwendbare Status-/Fehler-Box.
   * Rein optisch – zeigt die bereits vorhandenen Meldungstexte als moderne
   * Alert-Boxen an. Keine eigene Logik, kein Backend-Aufruf.
   *
   * @typedef {Object} Props
   * @property {string} [error]  Fehlertext (rot). Leerer String = ausgeblendet.
   * @property {string} [status] Erfolgs-/Statustext (grün). Leer = ausgeblendet.
   */

  /** @type {Props} */
  let { error = '', status = '' } = $props();
</script>

{#if error}
  <div
    role="alert"
    class="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
  >
    <span class="mt-0.5 shrink-0" aria-hidden="true">⚠️</span>
    <span class="min-w-0 break-words">{error}</span>
  </div>
{/if}

{#if status}
  <div
    role="status"
    aria-live="polite"
    class="mb-5 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
  >
    <span class="mt-0.5 shrink-0" aria-hidden="true">✅</span>
    <span class="min-w-0 break-words">{status}</span>
  </div>
{/if}
