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
<div class="min-h-screen flex flex-col bg-slate-50 text-slate-900">
  {@render children?.()}

  <!-- Semantischer Footer: dezenter technischer Hinweis statt Navigation -->
  <footer class="mt-auto bg-slate-200 text-slate-600 py-4">
    <div class="max-w-4xl mx-auto px-4 text-center space-y-1">
      <p class="text-sm">Web-Programmierung Projekt &ndash; Barrierefreies A/B-Umfragetool</p>
      <p class="text-xs text-slate-500">SSR &middot; Express &middot; RabbitMQ</p>
    </div>
  </footer>
</div>
