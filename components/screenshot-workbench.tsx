import { ChangeEvent, useMemo, useState } from "react";
import { generateCode, initialCodeFor, SupportedFramework } from "../lib/generator";

const EMPTY_FILE_LABEL = "No file selected";

export function ScreenshotWorkbench() {
  const [framework, setFramework] = useState<SupportedFramework>("next");
  const [prompt, setPrompt] = useState<string>("");
  const [imageName, setImageName] = useState<string>(EMPTY_FILE_LABEL);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [code, setCode] = useState<string>(initialCodeFor("next"));

  const canGenerate = useMemo<boolean>(
    () => imageName !== EMPTY_FILE_LABEL || prompt.trim().length > 0,
    [imageName, prompt]
  );

  const onFrameworkChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedFramework = event.target.value as SupportedFramework;
    setFramework(selectedFramework);
    setCode(initialCodeFor(selectedFramework));
  };

  const onImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const fileName = event.target.files?.[0]?.name;
    setImageName(fileName ?? EMPTY_FILE_LABEL);
  };

  const onPromptChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.target.value);
  };

  const onGenerate = async () => {
    if (!canGenerate) {
      return;
    }
    setIsGenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      setCode(generateCode(prompt, framework));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main>
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 lg:grid-cols-[380px,1fr]">
            <aside className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur">
              <h1 className="text-xl font-semibold text-white">Screenshot to Code</h1>
              <p className="mt-2 text-sm text-slate-300">
                Upload screenshot, add notes, and generate production-ready starter code for Vercel deployment.
              </p>

              <label className="mt-6 block text-sm font-medium text-slate-200">Framework</label>
              <select
                value={framework}
                onChange={onFrameworkChange}
                className="mt-2 w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="next">Next.js (recommended)</option>
                <option value="react">React</option>
                <option value="html">HTML + Tailwind</option>
              </select>

              <label className="mt-4 block text-sm font-medium text-slate-200">Screenshot</label>
              <input
                type="file"
                accept="image/*"
                onChange={onImageChange}
                className="mt-2 block w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
              />
              <p className="mt-2 text-xs text-slate-400">{imageName}</p>

              <label className="mt-4 block text-sm font-medium text-slate-200">Design notes</label>
              <textarea
                value={prompt}
                onChange={onPromptChange}
                placeholder="Example: pricing section 3 columns, rounded cards, bold heading"
                className="mt-2 min-h-28 w-full rounded-xl border border-white/20 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
              />

              <button
                onClick={onGenerate}
                disabled={!canGenerate || isGenerating}
                className="mt-4 w-full rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-600"
              >
                {isGenerating ? "Generating..." : "Generate code"}
              </button>
            </aside>

            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Generated output</h2>
                <span className="rounded-lg border border-emerald-300/30 bg-emerald-400/10 px-2 py-1 text-xs text-emerald-300">
                  Local mode · no backend
                </span>
              </div>
              <pre className="max-h-[72vh] overflow-auto rounded-xl border border-white/10 bg-[#020617] p-4 text-xs leading-5 text-slate-200">
                {code}
              </pre>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
