import { FaGithub, FaArrowRight } from "react-icons/fa";
import Footer from "./LandingPage/Footer";
import { Button } from "../ui/button";
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
      "Generate code for React, Vue, HTML/Tailwind, Bootstrap, Ionic, and more. Choose your stack, get your code.",
  },
  {
    number: "03",
    title: "Iterate & Refine",
    description:
      "Not perfect on the first try? Use follow-up prompts to refine colors, spacing, components, or functionality.",
  },
  {
    number: "04",
    title: "Video to Prototype",
    description:
      "Record your screen or upload a video. We'll extract the UI and turn it into functional code.",
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
              layout: { privacyPageUrl: "https://a.picoapps.xyz/camera-write" },
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FFFCF2]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[#E85D04] rounded-full" />
              <span className="text-lg font-semibold tracking-tight">
                Screenshot to Code
              </span>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/abi/screenshot-to-code"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover-line hidden sm:block"
              >
                GitHub
              </a>
              <button
                onClick={signIn}
                className="text-sm text-gray-600 hover-line"
              >
                Sign in
              </button>
              <button
                onClick={signIn}
                className="btn-primary px-5 py-2.5 text-sm font-medium"
              >
                <span>Get Started</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 px-6 bg-grid noise-overlay overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl">
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-8 animate-fade-up">
              <span className="stat-highlight text-sm text-[#E85D04]">
                71,502
              </span>
              <span className="text-sm text-gray-500">stars on GitHub</span>
              <div className="h-px w-12 bg-gray-300" />
            </div>

            {/* Main headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-6 animate-fade-up delay-100">
              Turn any
              <br />
              <span className="font-editorial not-italic">screenshot</span>
              <br />
              into{" "}
              <span className="text-outline">code</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl sm:text-2xl text-gray-600 max-w-xl mb-10 leading-relaxed animate-fade-up delay-200">
              AI-powered conversion from visual designs to clean, production-ready code.
              Supporting React, Vue, HTML, and more.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-up delay-300">
              <button
                onClick={signIn}
                className="btn-primary px-8 py-4 text-base font-medium inline-flex items-center gap-2 group"
              >
                <span>Start Building Free</span>
                <FaArrowRight className="text-sm transition-transform group-hover:translate-x-1" />
              </button>
              <Button
                variant="outline"
                onClick={() =>
                  window.open(
                    "https://github.com/abi/screenshot-to-code",
                    "_blank"
                  )
                }
                className="px-8 py-4 text-base border-2 border-[#0D0D0D] bg-transparent hover:bg-[#0D0D0D] hover:text-white transition-colors"
              >
                <FaGithub className="mr-2" />
                View Source
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/2 right-10 w-32 h-32 border-2 border-[#E85D04] opacity-20 rotate-12 hidden lg:block" />
        <div className="absolute bottom-20 right-1/4 w-4 h-4 bg-[#E85D04] hidden lg:block" />
      </header>

      {/* Video Demo Section */}
      <section className="py-20 px-6 bg-[#0D0D0D]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-gray-400 text-sm uppercase tracking-widest mb-4">
              See it in action
            </p>
            <h2 className="text-white text-3xl sm:text-4xl font-bold">
              From screenshot to code in{" "}
              <span className="font-editorial text-[#E85D04]">seconds</span>
            </h2>
          </div>

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
        </div>
      </section>

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
          <p className="text-center text-sm text-gray-500 uppercase tracking-widest mb-12">
            Trusted by teams at
          </p>
          <div className="flex gap-16 items-center justify-center flex-wrap">
            {LOGOS.map((companyName) => (
              <img
                key={companyName}
                className="h-6 w-auto object-contain grayscale opacity-40 hover:opacity-70 transition-opacity"
                src={`https://picoapps.xyz/logos/${companyName}.png`}
                alt={companyName}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-[#FFFCF2]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm text-[#E85D04] uppercase tracking-widest mb-4">
              What people say
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Developers{" "}
              <span className="font-editorial">love</span>
              {" "}it
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
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
          <div className="inline-flex items-center gap-2 mb-8">
            <div className="w-2 h-2 bg-[#E85D04] rounded-full animate-pulse" />
            <span className="text-gray-400 text-sm">Open source & free to use</span>
          </div>

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
              className="bg-white text-[#0D0D0D] px-8 py-4 text-base font-semibold hover:bg-[#E85D04] hover:text-white transition-colors inline-flex items-center justify-center gap-2"
            >
              Get Started Free
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
        <div className="absolute bottom-0 right-0 w-48 h-48 border-l border-t border-[#E85D04]/20" />
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default LandingPage;
