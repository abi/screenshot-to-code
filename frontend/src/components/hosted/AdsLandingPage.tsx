import { FaArrowRight, FaGithub } from "react-icons/fa";

const FEATURES = [
  {
    number: "01",
    title: "Screenshot to Code",
    description:
      "Drop in a screenshot, mockup, or design reference and generate editable frontend code.",
  },
  {
    number: "02",
    title: "Video to Code",
    description:
      "Record a UI interaction and turn the flow into a working component draft.",
  },
  {
    number: "03",
    title: "Choose Your Stack",
    description:
      "Generate HTML, React, Vue, Tailwind, Bootstrap, Ionic, and more.",
  },
  {
    number: "04",
    title: "Iterate in Place",
    description:
      "Use follow-up prompts to refine layout, spacing, colors, content, and behavior.",
  },
];

const STEPS = [
  {
    title: "Upload",
    description: "Start with a screenshot, design image, text prompt, or short recording.",
  },
  {
    title: "Generate",
    description: "Pick a stack and create a working frontend draft in seconds.",
  },
  {
    title: "Refine",
    description: "Edit the code directly or ask for targeted visual changes.",
  },
];

const appUrl = "/?utm_source=google_ads&utm_medium=cpc&utm_campaign=clean_landing";
const faqUrl =
  "/faqs?utm_source=google_ads&utm_medium=cpc&utm_campaign=clean_landing";

function AdsLandingPage() {
  return (
    <div className="min-h-screen landing-bg font-display">
      <nav className="fixed left-0 right-0 top-0 z-50 landing-bg-nav px-4 backdrop-blur-sm sm:px-6">
        <div className="mx-auto max-w-7xl py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <a href="/ads" className="flex items-center gap-2">
              <img
                src="/favicon/main.png"
                alt="Screenshot to Code"
                className="h-6 w-6 logo-dark-mode"
              />
              <span className="text-base font-semibold tracking-tight sm:text-lg">
                Screenshot to Code
              </span>
            </a>
            <div className="flex items-center gap-3 sm:gap-6">
              <a
                href={faqUrl}
                className="hidden text-sm landing-text-muted hover-line sm:block"
              >
                FAQ
              </a>
              <a
                href={appUrl}
                className="btn-primary px-4 py-2 text-sm font-medium sm:px-5 sm:py-2.5"
              >
                <span>Try it</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <header className="relative overflow-hidden bg-grid noise-overlay px-0 pb-0 pt-20 sm:px-6 sm:pb-16 sm:pt-28 lg:pb-20 lg:pt-32">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
              <div className="flex w-full flex-col justify-center px-5 py-14 sm:min-h-0 sm:px-0 sm:py-0">
                <div className="mb-6 hidden items-center gap-3 sm:flex">
                  <span className="stat-highlight text-sm text-[#2563EB]">
                    71,502
                  </span>
                  <span className="text-sm landing-text-muted">
                    stars on GitHub
                  </span>
                  <div className="h-px w-12 border-t landing-border" />
                </div>

                <h1 className="mb-5 text-5xl font-bold leading-[0.9] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
                  Build User
                  <br />
                  Interfaces
                  <br />
                  <span className="text-[#2563EB]">10x Faster</span>
                </h1>

                <p className="mb-8 max-w-md text-xl leading-relaxed landing-text-muted sm:text-xl">
                  AI-powered conversion from screenshots, mockups, and UI
                  recordings to clean, production-ready code.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <a
                    href={appUrl}
                    className="btn-primary group inline-flex items-center justify-center gap-2 px-6 py-4 text-base font-medium sm:px-6 sm:py-3.5"
                  >
                    <span>Start Building</span>
                    <FaArrowRight className="relative z-10 text-sm transition-transform group-hover:translate-x-1" />
                  </a>
                  <a
                    href="https://github.com/abi/screenshot-to-code"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="landing-github-btn inline-flex items-center justify-center gap-2 px-6 py-4 text-base font-medium transition-colors sm:px-6 sm:py-3.5"
                  >
                    <FaGithub className="text-lg" />
                    <span>GitHub</span>
                    <span className="hidden rounded-full px-2 py-0.5 font-mono text-xs landing-github-badge sm:inline">
                      71.5k
                    </span>
                  </a>
                </div>
              </div>

              <div className="relative">
                <div className="video-frame">
                  <video
                    src="/demos/instagram.mp4"
                    className="w-full"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                  />
                </div>
                <p className="mt-4 text-center text-sm landing-text-muted">
                  Screenshot to code in seconds
                </p>
              </div>
            </div>
          </div>

          <div className="absolute right-4 top-1/4 hidden h-24 w-24 rotate-12 border-2 border-[#2563EB] opacity-10 xl:block" />
        </header>

        <section className="px-6 py-24 landing-bg">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="relative order-2 lg:order-1">
              <div className="video-frame">
                <video
                  src="/demos/tally form.mp4"
                  className="w-full"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                />
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#2563EB]/10 px-4 py-2 text-[#2563EB]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2563EB] opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2563EB]" />
                </span>
                <span className="text-sm font-medium">Video input supported</span>
              </div>
              <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
                From visual reference to working code
              </h2>
              <p className="mb-8 max-w-md text-xl leading-relaxed landing-text-muted">
                Capture what you want to build, generate a first draft, and
                iterate quickly without hand-recreating every visual detail.
              </p>
              <a
                href={appUrl}
                className="btn-primary group inline-flex items-center gap-2 px-6 py-3 text-sm font-medium"
              >
                <span>Try the generator</span>
                <FaArrowRight className="relative z-10 text-xs transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </section>

        <section className="px-6 py-24 landing-bg-white" id="features">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-2">
              <div className="lg:sticky lg:top-32">
                <div className="accent-line mb-8 w-16" />
                <h2 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl">
                  Built for the way
                  <br />
                  <span className="font-editorial">you work</span>
                </h2>
                <p className="mb-8 max-w-md text-xl landing-text-muted">
                  No complex setup. No blank canvas. Just paste, generate, and
                  keep refining.
                </p>
                <a
                  href={appUrl}
                  className="btn-primary group inline-flex items-center gap-2 px-6 py-3 text-sm font-medium"
                >
                  <span>Start now</span>
                  <FaArrowRight className="relative z-10 text-xs transition-transform group-hover:translate-x-1" />
                </a>
              </div>

              <div className="space-y-6">
                {FEATURES.map((feature) => (
                  <article key={feature.number} className="feature-card-unique p-8">
                    <div className="flex items-start gap-6">
                      <span className="stat-highlight text-3xl opacity-20">
                        {feature.number}
                      </span>
                      <div>
                        <h3 className="mb-2 text-xl font-semibold">
                          {feature.title}
                        </h3>
                        <p className="leading-relaxed landing-text-muted">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y px-6 py-20 landing-border landing-bg">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <article key={step.title} className="feature-card-unique p-8">
                  <span className="stat-highlight text-sm text-[#2563EB]">
                    0{index + 1}
                  </span>
                  <h3 className="mt-10 text-2xl font-semibold">{step.title}</h3>
                  <p className="mt-3 leading-relaxed landing-text-muted">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#0D0D0D] px-6 py-24">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

          <div className="relative mx-auto max-w-4xl text-center">
            <h2 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Ready to ship
              <br />
              <span className="text-outline text-white">faster?</span>
            </h2>
            <p className="mx-auto mb-10 max-w-xl text-xl text-gray-400">
              Join developers using visual references to move faster from idea
              to working UI.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href={appUrl}
                className="inline-flex items-center justify-center gap-2 bg-white px-8 py-4 text-base font-semibold text-[#0D0D0D] transition-colors hover:bg-[#2563EB] hover:text-white"
              >
                Start Building
                <FaArrowRight className="text-sm" />
              </a>
              <a
                href="https://github.com/abi/screenshot-to-code"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-white/20 px-8 py-4 text-base font-medium text-white transition-colors hover:border-white/40"
              >
                <FaGithub />
                Star on GitHub
              </a>
            </div>
          </div>

          <div className="absolute bottom-0 right-0 h-48 w-48 border-l border-t border-[#2563EB]/20" />
        </section>
      </main>

      <footer className="border-t px-6 landing-bg landing-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/favicon/main.png"
              alt="Screenshot to Code"
              className="h-6 w-6 logo-dark-mode"
            />
            <span className="text-sm font-semibold tracking-tight">
              Screenshot to Code
            </span>
          </div>
          <div className="flex flex-wrap gap-5 text-sm landing-text-muted">
            <a className="hover-line" href={faqUrl}>
              FAQ
            </a>
            <a
              className="hover-line"
              href="https://github.com/abi/screenshot-to-code"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a className="hover-line" href="mailto:support@picoapps.xyz">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AdsLandingPage;
