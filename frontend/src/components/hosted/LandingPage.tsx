import { FaGithub, FaCode, FaBolt, FaMagic, FaLayerGroup } from "react-icons/fa";
import Footer from "./LandingPage/Footer";
import { Button } from "../ui/button";
import { SignUp } from "@clerk/clerk-react";
import { useState } from "react";
import { Dialog, DialogContent } from "../ui/dialog";
import { Tweet } from "react-tweet";

const LOGOS = ["microsoft", "amazon", "mit", "stanford", "bytedance", "baidu"];

const FEATURES = [
  {
    icon: FaMagic,
    title: "AI-Powered Conversion",
    description:
      "Upload any screenshot or design and get production-ready code instantly",
  },
  {
    icon: FaCode,
    title: "Multiple Frameworks",
    description:
      "Generate code for React, Vue, HTML/Tailwind, Bootstrap, and more",
  },
  {
    icon: FaBolt,
    title: "Instant Results",
    description:
      "Get pixel-perfect code in seconds, not hours of manual coding",
  },
  {
    icon: FaLayerGroup,
    title: "Iterative Refinement",
    description:
      "Refine and iterate on generated code with follow-up prompts",
  },
];

function LandingPage() {
  const [isAuthPopupOpen, setIsAuthPopupOpen] = useState(false);

  const signIn = () => {
    setIsAuthPopupOpen(true);
  };

  return (
    <div className="min-h-screen bg-white">
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
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg hero-gradient animate-gradient flex items-center justify-center">
                <FaCode className="text-white text-sm" />
              </div>
              <span className="text-xl font-bold">Screenshot to Code</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                className="text-gray-600 hover:text-gray-900"
                onClick={() =>
                  window.open(
                    "https://github.com/abi/screenshot-to-code",
                    "_blank"
                  )
                }
              >
                <FaGithub className="mr-2" />
                GitHub
              </Button>
              <Button variant="outline" onClick={signIn}>
                Sign in
              </Button>
              <Button
                onClick={signIn}
                className="hero-gradient animate-gradient text-white border-0"
              >
                Get started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float" />
        <div
          className="absolute top-40 right-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float"
          style={{ animationDelay: "2s" }}
        />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              71,000+ stars on GitHub
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Build UIs{" "}
              <span className="text-gradient">10x Faster</span>
            </h1>

            <p className="text-xl sm:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Convert any screenshot or design into clean, production-ready code
              with AI
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="hero-gradient animate-gradient text-white border-0 text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                onClick={signIn}
              >
                Start Building Free
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
                className="text-lg px-8 py-6 rounded-xl border-2 hover:bg-gray-50"
              >
                <FaGithub className="mr-2" size={20} />
                View on GitHub
                <span className="ml-2 text-sm bg-gray-100 rounded-full px-3 py-1">
                  71,502
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Video Demo Section */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl animate-pulse-glow">
            <video
              src="/demos/youtube.mp4"
              className="w-full"
              autoPlay
              loop
              muted
              playsInline
            />
            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10" />
          </div>
          <p className="text-center text-gray-500 mt-6">
            Watch Screenshot to Code convert a YouTube screenshot to HTML/Tailwind in seconds
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to ship faster
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From screenshot to production code in seconds
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((feature, index) => (
              <div
                key={index}
                className="feature-card p-8 rounded-2xl border border-gray-100 bg-white hover:border-indigo-100"
              >
                <div className="w-12 h-12 rounded-xl hero-gradient animate-gradient flex items-center justify-center mb-5">
                  <feature.icon className="text-white text-xl" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Logo Wall */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-gray-600 mb-12 text-lg">
            Trusted by developers and designers at leading companies
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
            {LOGOS.map((companyName) => (
              <div
                key={companyName}
                className="flex items-center justify-center p-4"
              >
                <img
                  className="max-h-8 w-auto object-contain grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all duration-300"
                  src={`https://picoapps.xyz/logos/${companyName}.png`}
                  alt={companyName}
                  width={120}
                  height={48}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Loved by developers worldwide
            </h2>
            <p className="text-xl text-gray-600">
              Join thousands of developers shipping faster with Screenshot to Code
            </p>
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
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient animate-gradient opacity-90" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoLTJ2NGgyek0zNCAyMGgydjRoLTJ2LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to build faster?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Join over 71,000 developers who are already shipping UIs faster with Screenshot to Code
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={signIn}
              className="bg-white text-indigo-600 hover:bg-gray-100 text-lg px-8 py-6 rounded-xl font-semibold"
            >
              Get Started Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() =>
                window.open(
                  "https://github.com/abi/screenshot-to-code",
                  "_blank"
                )
              }
              className="border-2 border-white text-white hover:bg-white/10 text-lg px-8 py-6 rounded-xl bg-transparent"
            >
              <FaGithub className="mr-2" size={20} />
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
