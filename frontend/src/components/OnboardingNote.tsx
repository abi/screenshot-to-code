export function OnboardingNote() {
  return (
    <div className="flex flex-col space-y-4 bg-green-700 p-2 rounded text-stone-200 text-sm">
      <span>
        To use Screenshot to Code,{" "}
        <a
          className="inline underline hover:opacity-70"
          href="https://buy.stripe.com/cN28Az7ICclG5DGaEG"
          target="_blank"
        >
          get 100 generations for $15/month
        </a>{" "}
        or use your own OpenAI API key with GPT4 vision access (
        <a
          href="https://github.com/abi/screenshot-to-code/blob/main/Troubleshooting.md"
          className="inline underline hover:opacity-70"
          target="_blank"
        >
          follow these instructions to deposit a minimum $5 credit and obtain a
          key
        </a>
        ).
      </span>
    </div>
  );
}
