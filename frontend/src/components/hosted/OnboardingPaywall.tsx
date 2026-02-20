import { FaKeyboard, FaLayerGroup, FaMagic, FaVideo } from "react-icons/fa";
import PricingPlans from "./payments/PricingPlans";

const LOGOS = ["microsoft", "amazon", "mit", "stanford", "bytedance", "baidu"];

const FEATURES = [
  {
    icon: FaMagic,
    title: "Screenshot to Code",
    description: "Drop any screenshot or design and get production-ready code.",
  },
  {
    icon: FaVideo,
    title: "Video to Code",
    description: "Record your screen and convert interactions into components.",
  },
  {
    icon: FaKeyboard,
    title: "Text to Code",
    description: "Describe any UI in plain English and get working code.",
  },
  {
    icon: FaLayerGroup,
    title: "Any Framework",
    description: "React, Vue, HTML/Tailwind, Bootstrap, Ionic, and more.",
  },
];

function OnboardingPaywall() {
  return (
    <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-8 lg:py-12">
      <div className="w-full max-w-4xl">
        {/* Hero */}
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
            </span>
            71,000+ GitHub stars
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Your All-in-One{" "}
            <span className="text-blue-600 dark:text-blue-400">Front-End</span>{" "}
            Tool
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-gray-500 dark:text-zinc-400">
            Turn screenshots, videos, and text prompts into clean,
            production-ready code. Subscribe to get started.
          </p>
        </div>

        {/* Pricing — above the fold */}
        <PricingPlans shouldShowFAQLink={false} />

        {/* Demo video */}
        <div className="mx-auto mt-10 mb-10 max-w-2xl overflow-hidden rounded-xl border border-gray-200 shadow-lg dark:border-zinc-700">
          <video
            src="/demos/instagram.mp4"
            className="w-full"
            autoPlay
            loop
            muted
            playsInline
          />
        </div>

        {/* Feature highlights */}
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-gray-100 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900"
            >
              <feature.icon className="mx-auto mb-2 text-lg text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Social proof logos */}
        <div className="border-t border-gray-100 pt-8 dark:border-zinc-800">
          <p className="mb-4 text-center text-xs text-gray-400 dark:text-zinc-500">
            Trusted by engineers and designers at
          </p>
          <div className="mx-auto grid max-w-md grid-cols-6 items-center gap-x-4">
            {LOGOS.map((name) => (
              <img
                key={name}
                className="col-span-1 h-6 w-full object-contain opacity-40 grayscale transition-opacity hover:opacity-80"
                src={`https://picoapps.xyz/logos/${name}.png`}
                alt={name}
                width={80}
                height={24}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingPaywall;
