export type SupportedFramework = "html" | "react" | "next";

const starterByFramework: Record<SupportedFramework, string> = {
  html: `<main class="p-8">
  <section class="mx-auto max-w-4xl rounded-2xl border border-slate-700 bg-slate-900/70 p-8">
    <h1 class="text-3xl font-semibold text-white">Landing Header</h1>
    <p class="mt-3 text-slate-300">Responsive hero copied from screenshot layout.</p>
    <button class="mt-6 rounded-xl bg-indigo-500 px-5 py-3 font-medium text-white">Get started</button>
  </section>
</main>`,
  react: `export default function Screen() {
  return (
    <main className="p-8">
      <section className="mx-auto max-w-4xl rounded-2xl border border-slate-700 bg-slate-900/70 p-8">
        <h1 className="text-3xl font-semibold text-white">Landing Header</h1>
        <p className="mt-3 text-slate-300">Responsive hero copied from screenshot layout.</p>
        <button className="mt-6 rounded-xl bg-indigo-500 px-5 py-3 font-medium text-white">Get started</button>
      </section>
    </main>
  );
}`,
  next: `export default function HomePage() {
  return (
    <main className="p-8">
      <section className="mx-auto max-w-4xl rounded-2xl border border-slate-700 bg-slate-900/70 p-8">
        <h1 className="text-3xl font-semibold text-white">Landing Header</h1>
        <p className="mt-3 text-slate-300">Responsive hero copied from screenshot layout.</p>
        <button className="mt-6 rounded-xl bg-indigo-500 px-5 py-3 font-medium text-white">Get started</button>
      </section>
    </main>
  );
}`
};

export function initialCodeFor(framework: SupportedFramework): string {
  return starterByFramework[framework];
}

export function generateCode(prompt: string, framework: SupportedFramework): string {
  const base = starterByFramework[framework];
  if (!prompt.trim()) {
    return base;
  }

  const normalized = prompt.toLowerCase();
  const sections: string[] = [base];

  if (normalized.includes("pricing")) {
    sections.push("\n\n// Added pricing cards based on screenshot intent");
  }
  if (normalized.includes("dashboard")) {
    sections.push("\n// Added sidebar + stats widgets based on screenshot intent");
  }
  if (normalized.includes("mobile")) {
    sections.push("\n// Mobile-first spacing and stack preserved");
  }

  return sections.join("\n");
}
