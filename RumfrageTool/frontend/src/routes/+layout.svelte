<script>
  import '../app.css';
</script>

<div class="min-h-screen flex flex-col">
  <!-- Semantischer Header -->
  <header class="bg-indigo-900 text-white shadow-md">
    <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-2xl" aria-hidden="true">📊</span>
        <span class="text-xl font-bold tracking-tight">PulsePoll</span>
      </div>
      <span class="text-xs sm:text-sm text-indigo-200 font-medium">
        SSR &bull; Express &bull; RabbitMQ
      </span>
    </div>
  </header>

  <!-- Semantischer Hauptbereich (wächst dank flex-1 automatisch auf volle Höhe) -->
  <main class="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-8">
    <slot />
  </main>

  <!-- Semantischer Footer -->
  <footer class="bg-slate-200 text-slate-700 text-center text-sm py-4 mt-auto">
    <div class="max-w-4xl mx-auto px-4">
      <p>Web-Programmierung Projekt &ndash; Barrierefreies A/B-Umfragetool</p>
    </div>
  </footer>
</div>