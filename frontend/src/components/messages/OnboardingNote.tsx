export function OnboardingNote() {
  return (
    <div className="flex flex-col space-y-4 bg-green-700 p-2 rounded text-stone-200 text-sm">
      <span>
        To use Screenshot to Code,{" "}
        <a
          className="inline underline hover:opacity-70"
          href="https://buy.stripe.com/8wM6sre70gBW1nqaEE"
          target="_blank"
        >
          buy some credits (100 generations for $36)
        </a>{" "}
        or use your own OpenAI API key with GPT4 vision access.{" "}
        <a
          href="https://github.com/abi/screenshot-to-code/blob/main/Troubleshooting.md"
          className="inline underline hover:opacity-70"
          target="_blank"
        >
          Follow these instructions to get yourself a key.
        </a>{" "}
        and paste it in the Settings dialog (gear icon above). Your key is only
        stored in your browser. Never stored on our servers.
      </span>
    </div>
  );
}
