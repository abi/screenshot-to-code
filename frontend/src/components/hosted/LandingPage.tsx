import { FaGithub, FaArrowRight } from "react-icons/fa";
import Footer from "./LandingPage/Footer";
import { SignUp } from "@clerk/clerk-react";
import { useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { Tweet } from "react-tweet";

const LOGOS = ["microsoft", "amazon", "mit", "stanford", "bytedance", "baidu"];

const FEATURES = [
  {
    number: "01",
    title: "Screenshot to Code",
    description:
      "Drop any screenshot, Figma design, or mockup. Our AI analyzes the visual structure and generates production-ready code.",
  },
  {
    number: "02",
    title: "Framework Agnostic",
    description:
      "Generate code for HTML/CSS, React, Vue, HTML/Tailwind, Bootstrap, Ionic, and more. Choose your stack, get your code.",
  },
  {
    number: "03",
    title: "Iterate & Refine",
    description:
      "Not perfect on the first try? Use follow-up prompts to refine colors, spacing, components, or functionality.",
  },
  {
    number: "04",
    title: "Text to Code",
    description: "Describe any UI you want in plain English.",
  },
];

function LandingPage() {
  const [isAuthPopupOpen, setIsAuthPopupOpen] = useState(false);

  const signIn = () => {
    setIsAuthPopupOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FFFCF2] font-display">
      {/* Auth dialog */}
      <Dialog
        open={isAuthPopupOpen}
        onOpenChange={(value) => setIsAuthPopupOpen(value)}
      >
        <DialogContent className="flex justify-center bg-[#FFFCF2]">
          <SignUp
            fallbackRedirectUrl="/app"
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
              layout: { privacyPageUrl: "https://a.picoapps.xyz/camera-write" },
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FFFCF2]/90 backdrop-blur-sm px-4 sm:px-6">
        <div className="max-w-7xl mx-auto py-4 sm:py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/favicon/main.png" alt="Logo" className="w-6 h-6" />
              <span className="text-base sm:text-lg font-semibold tracking-tight">
                Screenshot to Code
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-6">
              <button
                onClick={signIn}
                className="text-sm text-gray-600 hover-line hidden sm:block"
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
              <div className="hidden sm:flex items-center gap-3 mb-6 animate-fade-up">
                <span className="stat-highlight text-sm text-[#2563EB]">
                  71,502
                </span>
                <span className="text-sm text-gray-500">stars on GitHub</span>
                <div className="h-px w-12 bg-gray-300" />
              </div>

              {/* Main headline */}
              <h1 className="text-5xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[0.9] mb-5 sm:mb-5 animate-fade-up delay-100">
                Build User
                <br />
                Interfaces
                <br />
                <span className="text-[#2563EB]">10x Faster</span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl sm:text-xl text-gray-600 max-w-md mb-8 sm:mb-8 leading-relaxed animate-fade-up delay-200">
                AI-powered conversion from screenshots and designs to clean, production-ready code.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 animate-fade-up delay-300">
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
                  className="px-6 py-4 sm:px-6 sm:py-3.5 text-base sm:text-base font-medium border-2 border-[#0D0D0D] bg-transparent hover:bg-[#0D0D0D] hover:text-white transition-colors inline-flex items-center justify-center gap-2"
                >
                  <FaGithub className="text-lg" />
                  <span>GitHub</span>
                  <span className="hidden sm:inline bg-[#0D0D0D] text-white text-xs px-2 py-0.5 rounded-full font-mono">
                    71.5k
                  </span>
                </button>
              </div>
            </div>

            {/* Right side - Video demo */}
            <div className="relative animate-fade-up delay-200">
              <div className="video-frame">
                <video
                  src="/demos/instagram.mp4"
                  className="w-full"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              </div>
              <p className="text-sm text-gray-500 mt-4 text-center">
                Screenshot → Code in seconds
              </p>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/4 right-4 w-24 h-24 border-2 border-[#2563EB] opacity-10 rotate-12 hidden xl:block" />
      </header>

      {/* Features Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left side - Section intro */}
            <div className="lg:sticky lg:top-32">
              <div className="accent-line w-16 mb-8" />
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
                Built for the way
                <br />
                <span className="font-editorial">you work</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8 max-w-md">
                No complex setup. No learning curve. Just paste, click, and ship.
              </p>
              <button
                onClick={signIn}
                className="btn-primary px-6 py-3 text-sm font-medium inline-flex items-center gap-2 group"
              >
                <span>Try it now</span>
                <FaArrowRight className="text-xs transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Right side - Feature cards */}
            <div className="space-y-6">
              {FEATURES.map((feature, index) => (
                <div
                  key={index}
                  className="feature-card-unique p-8"
                >
                  <div className="flex items-start gap-6">
                    <span className="stat-highlight text-3xl text-gray-200">
                      {feature.number}
                    </span>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Logo Wall */}
      <section className="py-16 px-6 border-y border-gray-200 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            #1 tool used by developers and designers from leading companies.
            <br className="hidden sm:block" />
            {" "}Fully open source with{" "}
            <span className="stat-highlight text-[#2563EB]">71,000+</span> stars on GitHub.
          </p>
          <div className="flex gap-12 sm:gap-16 items-center justify-center flex-wrap">
            {LOGOS.map((companyName) => (
              <img
                key={companyName}
                className="h-8 sm:h-10 w-auto object-contain grayscale opacity-50 hover:opacity-80 transition-opacity"
                src={`https://picoapps.xyz/logos/${companyName}.png`}
                alt={companyName}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-[#FFFCF2] overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm text-[#2563EB] uppercase tracking-widest mb-4">
              What people say
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Developers{" "}
              <span className="font-editorial">love</span>
              {" "}it
            </h2>
          </div>

          <div className="compact-tweets grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start [&_>_div]:min-w-0">
            <Tweet id="1733865178905661940" />
            <Tweet id="1727105236811366669" />
            <Tweet id="1732032876739224028" />
            <Tweet id="1728496255473459339" />
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
            Join 71,000+ developers building UIs at lightning speed
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
