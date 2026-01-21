import { FaGithub } from "react-icons/fa";
import Footer from "./LandingPage/Footer";
import { Button } from "../ui/button";
import { SignUp } from "@clerk/clerk-react";
import { useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { Tweet } from "react-tweet";

const LOGOS = ["microsoft", "amazon", "mit", "stanford", "bytedance", "baidu"];

const FRAMEWORKS = [
  { name: "HTML", color: "bg-orange-500" },
  { name: "React", color: "bg-cyan-500" },
  { name: "Vue", color: "bg-emerald-500" },
  { name: "Tailwind", color: "bg-sky-500" },
  { name: "Bootstrap", color: "bg-purple-500" },
  { name: "Ionic", color: "bg-blue-500" },
  { name: "SVG", color: "bg-amber-500" },
];

function LandingPage() {
  const [isAuthPopupOpen, setIsAuthPopupOpen] = useState(false);

  const signIn = () => {
    setIsAuthPopupOpen(true);
  };

  return (
    <div className="w-full">
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
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">&lt;/&gt;</span>
              </div>
              <span className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Screenshot to Code
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={signIn}
                className="text-gray-600 hover:text-gray-900"
              >
                Sign in
              </Button>
              <Button
                onClick={signIn}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-purple-500/20"
              >
                Get started free
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-violet-50 via-white to-white -z-10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-violet-200/40 via-purple-200/30 to-pink-200/20 rounded-full blur-3xl -z-10" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
              </span>
              71,000+ stars on GitHub
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6">
              Turn any design into
              <span className="block mt-2 bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                production-ready code
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10">
              Upload a screenshot, mockup, or Figma design and get clean,
              responsive code instantly. Works with React, Vue, HTML, and more.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                onClick={signIn}
                className="w-full sm:w-auto px-8 py-6 text-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30"
              >
                Start building for free
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() =>
                  window.open(
                    "https://github.com/abi/screenshot-to-code",
                    "_blank"
                  )
                }
                className="w-full sm:w-auto px-8 py-6 text-lg border-gray-200 hover:bg-gray-50 group"
              >
                <FaGithub className="mr-2" size={22} />
                <span>View on GitHub</span>
                <span className="ml-2 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-sm font-medium group-hover:bg-gray-200 transition-colors">
                  71,502
                </span>
              </Button>
            </div>

            {/* Framework badges */}
            <div className="mt-12 flex flex-wrap justify-center gap-2">
              {FRAMEWORKS.map((framework) => (
                <span
                  key={framework.name}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm text-gray-700 shadow-sm"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${framework.color}`}
                  ></span>
                  {framework.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Demo Video Section */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              See it in action
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Watch Screenshot to Code convert a YouTube screenshot to
              pixel-perfect HTML and Tailwind in seconds
            </p>
          </div>

          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-gray-900/10 border border-gray-200 bg-white">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 bg-white rounded-md text-xs text-gray-500 border border-gray-200">
                  screenshottocode.com
                </div>
              </div>
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
        </div>
      </section>

      {/* Logo Wall Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-violet-600 uppercase tracking-wider mb-3">
              Trusted worldwide
            </p>
            <p className="text-gray-600 text-lg">
              Used by developers and designers from leading companies
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
            {LOGOS.map((companyName) => (
              <div
                key={companyName}
                className="flex justify-center items-center"
              >
                <img
                  className="h-8 w-auto object-contain grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all duration-300"
                  src={`https://picoapps.xyz/logos/${companyName}.png`}
                  alt={companyName}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              How it works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-violet-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                1. Upload your design
              </h3>
              <p className="text-gray-600">
                Drop a screenshot, mockup, or paste a Figma frame
              </p>
            </div>

            <div className="relative p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                2. AI generates code
              </h3>
              <p className="text-gray-600">
                GPT-4 Vision analyzes your design and writes clean code
              </p>
            </div>

            <div className="relative p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-pink-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                3. Export and ship
              </h3>
              <p className="text-gray-600">
                Get React, Vue, HTML, or other framework-ready code
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-violet-600 uppercase tracking-wider mb-3">
              Testimonials
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              What developers are saying
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            <Tweet id="1733865178905661940" />
            <Tweet id="1727105236811366669" />
            <Tweet id="1732032876739224028" />
            <Tweet id="1728496255473459339" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-violet-600 via-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-4xl font-bold text-white mb-6">
            Ready to build faster?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of developers who are shipping user interfaces in
            minutes instead of hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={signIn}
              className="px-8 py-6 text-lg bg-white text-purple-700 hover:bg-gray-100 shadow-lg"
            >
              Get started for free
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() =>
                window.open(
                  "https://github.com/abi/screenshot-to-code",
                  "_blank"
                )
              }
              className="px-8 py-6 text-lg border-white/30 text-white bg-white/10 hover:bg-white/20"
            >
              <FaGithub className="mr-2" size={22} />
              Star on GitHub
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default LandingPage;
