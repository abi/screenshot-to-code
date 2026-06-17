import { FaGithub, FaArrowRight } from "react-icons/fa";
import {
  SiReact,
  SiVuedotjs,
  SiTailwindcss,
  SiBootstrap,
  SiIonic,
  SiHtml5,
} from "react-icons/si";
import type { IconType } from "react-icons";
import Footer from "./LandingPage/Footer";
import { SignUp } from "@clerk/clerk-react";
import { Component, useState, type ErrorInfo, type ReactNode } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { EmbeddedTweet, TweetSkeleton, useTweet } from "react-tweet";
import type {
  Tweet as TweetData,
  TweetBase,
  TweetEntities,
} from "react-tweet/api";

const LOGOS = ["microsoft", "amazon", "mit", "stanford", "bytedance", "baidu"];

// Screenshot-to-Code examples. Drop the paired images into frontend/public/demos/
// using these exact names; until then each slot shows a labeled placeholder.
const SCREENSHOT_EXAMPLES = [
  {
    caption: "News layout",
    input: "/demos/nyt-lifestyle-before.webp",
    output: "/demos/nyt-lifestyle-after.webp",
  },
  {
    caption: "Example two",
    input: "/demos/yope-invite-before.webp",
    output: "/demos/yope-invite-after.webp",
  },
  {
    caption: "Pricing cards",
    input: "/demos/pricing-cards-before.webp",
    output: "/demos/pricing-cards-after.webp",
  },
];

const FRAMEWORKS: { name: string; Icon: IconType }[] = [
  { name: "HTML", Icon: SiHtml5 },
  { name: "Tailwind", Icon: SiTailwindcss },
  { name: "React", Icon: SiReact },
  { name: "Vue", Icon: SiVuedotjs },
  { name: "Bootstrap", Icon: SiBootstrap },
  { name: "Ionic", Icon: SiIonic },
];

// Example follow-up prompts shown in the Iterate & Refine section.
const REFINE_PROMPTS = [
  "Make the header sticky",
  "Use a darker color palette",
  "Add a mobile menu",
  "Tighten the spacing",
  "Make the CTA bigger",
];

const TESTIMONIALS = [
  {
    id: "1733865178905661940",
    title: "Fast first drafts",
    body: "Turn screenshots and mockups into editable frontend code, then keep iterating with follow-up prompts.",
    href: "https://x.com/i/web/status/1733865178905661940",
  },
  {
    id: "1727105236811366669",
    title: "Useful for builders",
    body: "A practical way to move from visual inspiration to working UI without rebuilding every detail by hand.",
    href: "https://x.com/i/web/status/1727105236811366669",
  },
  {
    id: "1732032876739224028",
    title: "Open source workflow",
    body: "Use the hosted app for speed, or inspect and run the open-source project locally when you need full control.",
    href: "https://x.com/i/web/status/1732032876739224028",
  },
  {
    id: "1728496255473459339",
    title: "Quick UI iteration",
    body: "Generate a starting point from an image, adjust the stack, and refine layout, spacing, colors, and behavior.",
    href: "https://x.com/i/web/status/1728496255473459339",
  },
];

type Testimonial = (typeof TESTIMONIALS)[number];

type TweetRenderBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

class TweetRenderBoundary extends Component<
  TweetRenderBoundaryProps,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unable to render embedded tweet", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function normalizeEntities(entities?: TweetEntities): TweetEntities {
  return {
    hashtags: Array.isArray(entities?.hashtags) ? entities.hashtags : [],
    urls: Array.isArray(entities?.urls) ? entities.urls : [],
    user_mentions: Array.isArray(entities?.user_mentions)
      ? entities.user_mentions
      : [],
    symbols: Array.isArray(entities?.symbols) ? entities.symbols : [],
    ...(Array.isArray(entities?.media) ? { media: entities.media } : {}),
  };
}

function normalizeTweetBase<T extends TweetBase>(tweet: T): T {
  return {
    ...tweet,
    entities: normalizeEntities(tweet.entities),
  };
}

function normalizeTweet(tweet: TweetData): TweetData {
  return {
    ...normalizeTweetBase(tweet),
    parent: tweet.parent ? normalizeTweetBase(tweet.parent) : undefined,
    quoted_tweet: tweet.quoted_tweet
      ? normalizeTweetBase(tweet.quoted_tweet)
      : undefined,
  };
}

function TweetFallback({ testimonial }: { testimonial: Testimonial }) {
  return (
    <a
      href={testimonial.href}
      target="_blank"
      rel="noreferrer"
      className="block h-full min-h-[220px] rounded-2xl border border-[#cfd9de] bg-white p-4 text-[#0f1419] transition-colors hover:bg-[#f7f9f9]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-sm font-bold text-white">
          X
        </div>
        <div className="min-w-0">
          <div className="font-bold leading-5">Builder on X</div>
          <div className="text-sm leading-5 text-[#536471]">
            @screenshottocode
          </div>
        </div>
      </div>
      <p className="mt-4 text-[15px] leading-6">{testimonial.body}</p>
      <div className="mt-5 text-sm text-[#536471]">
        {testimonial.title} · View post
      </div>
    </a>
  );
}

function SafeTweet({ testimonial }: { testimonial: Testimonial }) {
  const { data, error, isLoading } = useTweet(testimonial.id);
  const fallback = <TweetFallback testimonial={testimonial} />;

  if (isLoading) {
    return <TweetSkeleton />;
  }

  if (error || !data) {
    return fallback;
  }

  return (
    <TweetRenderBoundary fallback={fallback}>
      <EmbeddedTweet tweet={normalizeTweet(data)} />
    </TweetRenderBoundary>
  );
}

// Clerk's modal <SignUp> uses hash routing, so an OAuth provider (e.g.
// Google) redirects back to this page at #/sso-callback. On that fresh page
// load the dialog is closed, the component that owns the hash route isn't
// mounted, and the callback never gets processed - users looked signed out
// until they clicked Sign in again. Reopen the dialog on Clerk's callback /
// verification virtual routes so the handshake completes on its own.
const isClerkCallbackHash = () =>
  /(sso-callback|verify)/.test(window.location.hash);

// Shows a labeled placeholder until the example image is dropped in (and
// loads), so the section never renders a broken-image icon.
function ExampleMedia({ src, label }: {
  src: string;
  label: string;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full aspect-[4/3] overflow-hidden rounded-xl border landing-border bg-white dark:bg-black/[0.2]">
      <img
        src={src}
        alt={label}
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center">
          <span className="text-xs font-medium uppercase tracking-wider landing-text-muted">
            {label}
          </span>
          <span className="break-all font-mono text-[11px] text-gray-400">
            {src}
          </span>
        </div>
      )}
    </div>
  );
}

function LandingPage() {
  const [isAuthPopupOpen, setIsAuthPopupOpen] = useState(isClerkCallbackHash);

  const signIn = () => {
    setIsAuthPopupOpen(true);
  };

  return (
    <div className="min-h-screen landing-bg font-display">
      {/* Auth dialog */}
      <Dialog
        open={isAuthPopupOpen}
        onOpenChange={(value) => setIsAuthPopupOpen(value)}
      >
        <DialogContent className="flex justify-center bg-[#FFFCF2] border-0 shadow-2xl">
          <SignUp
            fallbackRedirectUrl="/"
            appearance={{
              elements: {
                cardBox: {
                  boxShadow: "none",
                  borderRadius: "0",
                  border: "none",
                  backgroundColor: "transparent",
                },
                card: {
                  borderRadius: "0",
                  border: "none",
                  backgroundColor: "transparent",
                },
                footer: {
                  display: "flex",
                  flexDirection: "column",
                  textAlign: "center",
                  background: "transparent",
                },
                footerAction: {
                  marginBottom: "5px",
                },
              },
              layout: { privacyPageUrl: "/legal/terms-of-service.html" },
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 landing-bg-nav backdrop-blur-sm px-4 sm:px-6">
        <div className="max-w-7xl mx-auto py-4 sm:py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/favicon/main.png" alt="Logo" className="w-6 h-6 logo-dark-mode" />
              <span className="text-base sm:text-lg font-semibold tracking-tight">
                Screenshot to Code
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-6">
              <button
                onClick={signIn}
                className="text-sm landing-text-muted hover-line hidden sm:block"
              >
                Sign in
              </button>
              <button
                onClick={signIn}
                className="btn-primary px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-medium"
              >
                <span>Get Started</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Demo */}
      <header className="relative pt-16 pb-0 sm:pt-28 sm:pb-16 lg:pt-32 lg:pb-20 px-0 sm:px-6 bg-grid noise-overlay overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6 sm:gap-8 lg:gap-12 items-center">
            {/* Left side - Text content */}
            <div className="px-5 sm:px-0 w-full min-h-[calc(100svh-80px)] sm:min-h-0 flex flex-col justify-center">
              {/* Eyebrow - hidden on mobile to reduce first screen density */}
              <div className="hidden sm:flex items-center gap-3 mb-6">
                <span className="stat-highlight text-sm text-[#2563EB]">
                  72,929
                </span>
                <span className="text-sm landing-text-muted">stars on GitHub</span>
                <div className="h-px w-12 landing-border border-t" />
              </div>

              {/* Main headline */}
              <h1 className="text-5xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[0.9] mb-5 sm:mb-5">
                Build User
                <br />
                Interfaces
                <br />
                <span className="text-[#2563EB]">10x Faster</span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl sm:text-xl landing-text-muted max-w-md mb-8 sm:mb-8 leading-relaxed">
                AI-powered conversion from screenshots and videos to clean, production-ready code.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={signIn}
                  className="btn-primary px-6 py-4 sm:px-6 sm:py-3.5 text-base sm:text-base font-medium inline-flex items-center justify-center gap-2 group"
                >
                  <span>Start Building</span>
                  <FaArrowRight className="text-sm transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() =>
                    window.open(
                      "https://github.com/abi/screenshot-to-code",
                      "_blank"
                    )
                  }
                  className="landing-github-btn px-6 py-4 sm:px-6 sm:py-3.5 text-base sm:text-base font-medium transition-colors inline-flex items-center justify-center gap-2"
                >
                  <FaGithub className="text-lg" />
                  <span>GitHub</span>
                  <span className="hidden sm:inline landing-github-badge text-xs px-2 py-0.5 rounded-full font-mono">
                    72.9k
                  </span>
                </button>
              </div>
            </div>

            {/* Right side - Video demo */}
            <div className="relative">
              <div className="video-frame">
                <video
                  src="/demos/youtube.mp4"
                  className="w-full"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>
              <p className="text-sm landing-text-muted mt-4 text-center">
                Screenshot → Code in seconds
              </p>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/4 right-4 w-24 h-24 border-2 border-[#2563EB] opacity-10 rotate-12 hidden xl:block" />
      </header>

      {/* Video Recording Section */}
      <section className="py-24 px-6 landing-bg">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left side - Video demo */}
            <div className="relative order-2 lg:order-1">
              <div className="video-frame">
                <video
                  src="/demos/tally form.mp4"
                  className="w-full"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>
            </div>

            {/* Right side - Content */}
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
                Video to Code
              </h2>
              <p className="text-xl landing-text-muted mb-6 max-w-md leading-relaxed">
                Record your screen showing a full website, app or UI interaction, and watch as our AI transforms it into functional, production-ready code.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="text-[#2563EB] mt-1">✓</span>
                  <span className="landing-text-muted">Capture complex interactions and animations</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#2563EB] mt-1">✓</span>
                  <span className="landing-text-muted">AI understands hover states, transitions & flows</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#2563EB] mt-1">✓</span>
                  <span className="landing-text-muted">Generate complete interactive components</span>
                </li>
              </ul>
              <button
                onClick={signIn}
                className="btn-primary px-6 py-3 text-sm font-medium inline-flex items-center gap-2 group"
              >
                <span>Try Video Recording</span>
                <FaArrowRight className="text-xs transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 01 - Screenshot to Code */}
      <section className="py-24 px-6 landing-bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-14">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
              Screenshot to Code
            </h2>
            <p className="text-xl landing-text-muted max-w-md leading-relaxed">
              From editorial layouts to mobile onboarding and pricing pages,
              preserve the hierarchy, spacing, imagery, and interaction-ready
              structure of the original design.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {SCREENSHOT_EXAMPLES.map((ex) => (
              <div key={ex.caption} className="feature-card-unique p-5">
                <div>
                  <span className="block text-xs font-medium uppercase tracking-wider landing-text-muted mb-2">
                    Screenshot
                  </span>
                  <ExampleMedia src={ex.input} label="Screenshot" />
                </div>
                <div className="flex justify-center py-3">
                  <FaArrowRight className="rotate-90 text-[#2563EB]" />
                </div>
                <div>
                  <span className="block text-xs font-medium uppercase tracking-wider text-[#2563EB] mb-2">
                    Generated code
                  </span>
                  <ExampleMedia src={ex.output} label="Result" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 02 - Framework Agnostic */}
      <section className="py-24 px-6 landing-bg border-y landing-border">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
            Framework agnostic
          </h2>
          <p className="text-xl landing-text-muted max-w-2xl mx-auto mb-14 leading-relaxed">
            Generate code for HTML/CSS, React, Vue, HTML/Tailwind, Bootstrap,
            Ionic, and more. Choose your stack, get your code.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-10 sm:gap-x-16">
            {FRAMEWORKS.map(({ name, Icon }) => (
              <div
                key={name}
                className="flex flex-col items-center gap-3 opacity-60 hover:opacity-100 transition-opacity"
              >
                <Icon className="h-10 w-10 sm:h-12 sm:w-12" />
                <span className="text-sm font-medium">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 03 - Iterate & Refine */}
      <section className="py-24 px-6 landing-bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
                Iterate &amp; refine
              </h2>
              <p className="text-xl landing-text-muted max-w-md leading-relaxed">
                Not perfect on the first try? Use follow-up prompts to refine
                colors, spacing, components, or functionality.
              </p>
            </div>
            <div className="feature-card-unique p-6 sm:p-8">
              <span className="block text-xs font-medium uppercase tracking-wider landing-text-muted mb-4">
                Follow-up prompts
              </span>
              <div className="flex flex-wrap gap-2.5">
                {REFINE_PROMPTS.map((prompt) => (
                  <span
                    key={prompt}
                    className="rounded-full border landing-border px-4 py-2 text-sm landing-text-muted"
                  >
                    {prompt}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 04 - Text to Code */}
      <section className="py-24 px-6 landing-bg border-t landing-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="order-2 lg:order-1 feature-card-unique p-6 sm:p-8">
              <span className="block text-xs font-medium uppercase tracking-wider landing-text-muted mb-3">
                Your prompt
              </span>
              <div className="rounded-xl border landing-border bg-black/[0.03] dark:bg-white/[0.04] p-4 font-mono text-sm leading-relaxed">
                A pricing page with three tiers, a monthly / yearly toggle, and a
                FAQ section below.
              </div>
              <button
                onClick={signIn}
                className="btn-primary mt-4 px-5 py-2.5 text-sm font-medium inline-flex items-center gap-2 group"
              >
                <span>Generate</span>
                <FaArrowRight className="text-xs transition-transform group-hover:translate-x-1" />
              </button>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
                Text to code
              </h2>
              <p className="text-xl landing-text-muted max-w-md leading-relaxed">
                Describe any UI you want in plain English — no screenshot
                required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Wall */}
      <section className="py-16 px-6 border-y landing-border overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <p className="text-center landing-text-muted mb-12 max-w-2xl mx-auto">
            #1 tool used by developers and designers from leading companies.
            <br className="hidden sm:block" />
            {" "}Fully open source with{" "}
            <span className="stat-highlight text-[#2563EB]">72,000+</span> stars on GitHub.
          </p>
          <div className="flex gap-12 sm:gap-16 items-center justify-center flex-wrap">
            {LOGOS.map((companyName) => (
              <img
                key={companyName}
                className="h-8 sm:h-10 w-auto object-contain grayscale opacity-50 hover:opacity-80 transition-opacity logo-dark-invert"
                src={`/logos/${companyName}.png`}
                alt={companyName}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 landing-bg overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm text-[#2563EB] uppercase tracking-widest mb-4">
              What people say
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Developers love it
            </h2>
          </div>

          <div className="compact-tweets grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start [&_>_div]:min-w-0">
            {TESTIMONIALS.map((testimonial) => (
              <SafeTweet key={testimonial.id} testimonial={testimonial} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-[#0D0D0D] relative overflow-hidden">
        {/* Decorative grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-6xl font-bold text-white tracking-tight mb-6">
            Ready to ship
            <br />
            <span className="text-outline text-white">faster?</span>
          </h2>

          <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto">
            Join 72,000+ developers building UIs at lightning speed
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={signIn}
              className="bg-white text-[#0D0D0D] px-8 py-4 text-base font-semibold hover:bg-[#2563EB] hover:text-white transition-colors inline-flex items-center justify-center gap-2"
            >
              Start Building
              <FaArrowRight className="text-sm" />
            </button>
            <button
              onClick={() =>
                window.open(
                  "https://github.com/abi/screenshot-to-code",
                  "_blank"
                )
              }
              className="border border-white/20 text-white px-8 py-4 text-base font-medium hover:border-white/40 transition-colors inline-flex items-center justify-center gap-2"
            >
              <FaGithub />
              Star on GitHub
            </button>
          </div>
        </div>

        {/* Corner decoration */}
        <div className="absolute bottom-0 right-0 w-48 h-48 border-l border-t border-[#2563EB]/20" />
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default LandingPage;
