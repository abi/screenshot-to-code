export function OnboardingNote() {
  return (
    <div className="flex flex-col space-y-4 bg-green-700 p-2 rounded text-stone-200 text-sm">
      <span>
        Add your Gemini API key in the Settings dialog (gear icon above) to start
        generating code. Your key is only stored in your browser and is never
        stored on our servers.
      </span>
    </div>
  );
}
