import PricingPlans from "./payments/PricingPlans";

const LOGOS = ["microsoft", "amazon", "mit", "stanford", "bytedance", "baidu"];

function OnboardingPaywall() {
  return (
    <div className="flex flex-1 flex-col items-center overflow-y-auto px-4 py-10 lg:py-16">
      <div className="w-full max-w-3xl">
        {/* Hero */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Build User Interfaces 10x Faster
          </h1>
          <p className="mt-3 text-base text-gray-500 dark:text-zinc-400">
            AI-powered conversion from screenshots and videos to clean,
            production-ready code. Subscribe to get started.
          </p>
        </div>

        {/* Pricing */}
        <PricingPlans shouldShowFAQLink={false} />

        {/* Social proof logos */}
        <div className="mt-10 border-t border-gray-100 pt-8 dark:border-zinc-800">
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
