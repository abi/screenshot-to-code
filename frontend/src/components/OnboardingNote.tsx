export function OnboardingNote() {
  return (
    <div className="flex flex-col space-y-4 bg-slate-500 p-2 rounded text-stone-200">
      Please add your OpenAI API key (must have GPT4 vision access) in the
      settings dialog (gear icon above).
      <br />
      <br />
      How do you get an OpenAI API key that has the GPT4 Vision model available?
      Create an OpenAI account. And then, you need to buy at least $1 worth of
      credit on the Billing dashboard.
      <br />
      <span>
        This key is only stored in your browser. Never stored on servers. This
        app is open source. You can{" "}
        <a href="https://github.com/abi/screenshot-to-code" className="inline">
          check the code to confirm.
        </a>
      </span>
    </div>
  );
}
