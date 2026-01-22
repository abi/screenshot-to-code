import { FaGithub, FaArrowRight } from "react-icons/fa";
import Footer from "./LandingPage/Footer";
import { SignUp } from "@clerk/clerk-react";
import { useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { Tweet } from "react-tweet";

const LOGOS = ["microsoft", "amazon", "mit", "stanford", "bytedance", "baidu"];

const FRAMEWORKS = [
  { name: "HTML", icon: "◇" },
  { name: "React", icon: "◈" },
  { name: "Vue", icon: "◆" },
  { name: "Tailwind", icon: "▣" },
  { name: "Bootstrap", icon: "▢" },
  { name: "Ionic", icon: "◎" },
  { name: "SVG", icon: "◉" },
];

function LandingPage() {
  const [isAuthPopupOpen, setIsAuthPopupOpen] = useState(false);

  const signIn = () => {
    setIsAuthPopupOpen(true);
  };

  return (
    <div className="w-full bg-[#FAFAF7] min-h-screen font-sans">
      {/* Subtle grain texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015] z-50"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Auth dialog */}
      <Dialog
        open={isAuthPopupOpen}
        onOpenChange={(value) => setIsAuthPopupOpen(value)}
      >
        <DialogContent className="flex justify-center">
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
      <nav className="sticky top-0 z-40 bg-[#FAFAF7]/90 backdrop-blur-sm border-b border-stone-200/60">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                <span className="text-[#FAFAF7] font-mono text-xs">&lt;/&gt;</span>
              </div>
              <span className="text-lg tracking-tight text-[#1a1a1a]">
                Screenshot to Code
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={signIn}
                className="text-[#1a1a1a]/70 hover:text-[#1a1a1a] text-sm tracking-wide transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={signIn}
                className="px-5 py-2.5 bg-[#1a1a1a] text-[#FAFAF7] text-sm tracking-wide rounded-full hover:bg-[#2a2a2a] transition-colors"
              >
                Get started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 sm:pt-28 pb-20 overflow-hidden">
        {/* Abstract shape */}
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[#FF6B4A]/10 via-[#FFB347]/5 to-transparent rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-[#4A9FFF]/8 to-transparent rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="max-w-4xl">
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-8">
              <span className="inline-flex items-center gap-2 text-sm text-[#1a1a1a]/60 tracking-wide">
                <span className="w-8 h-px bg-[#FF6B4A]"></span>
                Open source · 71,000+ GitHub stars
              </span>
            </div>

            {/* Main headline - editorial style */}
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl xl:text-8xl text-[#1a1a1a] leading-[0.95] tracking-tight mb-8">
              Designs become{" "}
              <span className="italic text-[#FF6B4A]">code</span>
              <br />
              in seconds
            </h1>

            <p className="text-lg sm:text-xl text-[#1a1a1a]/60 max-w-xl leading-relaxed mb-12">
              Drop any screenshot, mockup, or Figma frame. Get production-ready
              React, Vue, HTML, or Tailwind code instantly.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 items-center mb-16">
              <button
                onClick={signIn}
                className="group inline-flex items-center gap-3 px-7 py-4 bg-[#1a1a1a] text-[#FAFAF7] rounded-full hover:bg-[#2a2a2a] transition-all"
              >
                <span className="tracking-wide">Start building free</span>
                <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() =>
                  window.open(
                    "https://github.com/abi/screenshot-to-code",
                    "_blank"
                  )
                }
                className="inline-flex items-center gap-3 px-7 py-4 border border-[#1a1a1a]/20 text-[#1a1a1a] rounded-full hover:border-[#1a1a1a]/40 transition-colors"
              >
                <FaGithub size={18} />
                <span className="tracking-wide">View source</span>
                <span className="text-[#1a1a1a]/40 text-sm font-mono">
                  71.5k
                </span>
              </button>
            </div>

            {/* Framework tags */}
            <div className="flex flex-wrap gap-3">
              {FRAMEWORKS.map((framework) => (
                <span
                  key={framework.name}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm text-[#1a1a1a]/70 border border-[#1a1a1a]/10 rounded-full hover:border-[#1a1a1a]/20 transition-colors cursor-default"
                >
                  <span className="text-[#FF6B4A]">{framework.icon}</span>
                  {framework.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Demo Video Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="mb-12">
            <span className="text-sm text-[#1a1a1a]/40 tracking-widest uppercase">
              Demo
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#1a1a1a] mt-3 italic">
              Watch it work
            </h2>
          </div>

          <div className="relative">
            {/* Video container with unique frame */}
            <div className="relative bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-2xl">
              {/* Custom minimal browser chrome */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF6B4A]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#FFB347]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#4ADE80]"></div>
                </div>
                <div className="px-4 py-1.5 bg-white/5 rounded-lg">
                  <span className="text-white/40 text-xs font-mono">
                    screenshottocode.com
                  </span>
                </div>
                <div className="w-20"></div>
              </div>
              <video
                src="/demos/youtube.mp4"
                className="w-full"
                autoPlay
                loop
                muted
                playsInline
              />
            </div>

            {/* Decorative elements */}
            <div className="absolute -bottom-4 -right-4 w-32 h-32 border border-[#FF6B4A]/20 rounded-2xl -z-10"></div>
            <div className="absolute -top-4 -left-4 w-24 h-24 border border-[#4A9FFF]/20 rounded-2xl -z-10"></div>
          </div>
        </div>
      </section>

      {/* Logo Wall Section */}
      <section className="py-16 sm:py-24 border-y border-stone-200/60">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-4">
              <span className="text-sm text-[#1a1a1a]/40 tracking-widest uppercase">
                Trusted by
              </span>
              <p className="font-serif text-2xl sm:text-3xl text-[#1a1a1a] mt-3 leading-snug">
                Developers from <span className="italic">world-class</span>{" "}
                teams
              </p>
            </div>

            <div className="lg:col-span-8">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-8 items-center">
                {LOGOS.map((companyName) => (
                  <div
                    key={companyName}
                    className="flex justify-center items-center"
                  >
                    <img
                      className="h-7 w-auto object-contain grayscale opacity-40 hover:opacity-70 hover:grayscale-0 transition-all duration-500"
                      src={`https://picoapps.xyz/logos/${companyName}.png`}
                      alt={companyName}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - Editorial Style */}
      <section className="py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="max-w-2xl mb-16">
            <span className="text-sm text-[#1a1a1a]/40 tracking-widest uppercase">
              Process
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#1a1a1a] mt-3 leading-tight">
              Three steps to <span className="italic">shipping faster</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              {
                num: "01",
                title: "Upload",
                desc: "Drop a screenshot, paste from clipboard, or import from Figma",
              },
              {
                num: "02",
                title: "Generate",
                desc: "AI analyzes your design and writes clean, semantic code",
              },
              {
                num: "03",
                title: "Ship",
                desc: "Export to React, Vue, HTML, or copy directly to your project",
              },
            ].map((step, i) => (
              <div key={i} className="group">
                <div className="mb-6 overflow-hidden">
                  <span className="font-mono text-6xl sm:text-7xl text-[#1a1a1a]/[0.06] group-hover:text-[#FF6B4A]/20 transition-colors duration-500">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-xl font-medium text-[#1a1a1a] mb-3 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-[#1a1a1a]/50 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 sm:py-24 bg-[#1a1a1a]">
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-14">
            <span className="text-sm text-white/30 tracking-widest uppercase">
              Community
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-white mt-3 italic">
              What people are building
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start [&_.react-tweet-theme]:!bg-[#2a2a2a] [&_.react-tweet-theme]:!border-white/10">
            <Tweet id="1733865178905661940" />
            <Tweet id="1727105236811366669" />
            <Tweet id="1732032876739224028" />
            <Tweet id="1728496255473459339" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 sm:py-32 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAFAF7] via-[#FFF5F2] to-[#FAFAF7]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#FF6B4A]/5 rounded-full blur-3xl"></div>

        <div className="relative max-w-4xl mx-auto px-6 sm:px-8 text-center">
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#1a1a1a] leading-tight mb-8">
            Ready to build
            <br />
            <span className="italic text-[#FF6B4A]">10x faster?</span>
          </h2>
          <p className="text-lg text-[#1a1a1a]/50 max-w-xl mx-auto mb-10">
            Join thousands of developers who are shipping user interfaces in
            minutes, not hours.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={signIn}
              className="group inline-flex items-center gap-3 px-8 py-4 bg-[#1a1a1a] text-[#FAFAF7] rounded-full hover:bg-[#2a2a2a] transition-all text-lg"
            >
              <span>Get started free</span>
              <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() =>
                window.open(
                  "https://github.com/abi/screenshot-to-code",
                  "_blank"
                )
              }
              className="inline-flex items-center gap-3 px-8 py-4 border-2 border-[#1a1a1a]/20 text-[#1a1a1a] rounded-full hover:border-[#1a1a1a]/40 transition-colors text-lg"
            >
              <FaGithub size={20} />
              <span>Star on GitHub</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default LandingPage;
