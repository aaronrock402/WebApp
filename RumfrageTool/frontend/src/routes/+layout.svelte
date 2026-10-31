<script>
  import '../app.css';
  /**
   * @typedef {Object} Props
   * @property {import('svelte').Snippet} [children]
   */

  /** @type {Props} */
  let { children } = $props();
</script>

<!--
  Äußere Seitenhülle: min-h-screen + flex-col sorgt dafür, dass der Footer
  immer unten sitzt. Header und Hauptbereich werden von +page.svelte geliefert,
  weil dort der Login-/Benutzerstatus verwaltet wird (Single-Route-App).
-->
<div class="min-h-screen flex flex-col bg-white text-slate-900">
  {@render children?.()}

  <!-- Semantischer Footer: dezenter technischer Hinweis statt Navigation -->
  <footer class="mt-auto border-t border-slate-200 py-5">
    <div class="max-w-3xl mx-auto px-4 text-center space-y-1">
      <p class="text-xs text-slate-500">Web-Programmierung Projekt &ndash; Barrierefreies A/B-Umfragetool</p>
      <p class="text-xs text-slate-400">SSR &middot; Express &middot; RabbitMQ</p>
    </div>
  </footer>
</div>
