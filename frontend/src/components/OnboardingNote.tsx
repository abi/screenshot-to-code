import { useStore } from "../store/store";

export function OnboardingNote() {
  const setPricingDialogOpen = useStore((state) => state.setPricingDialogOpen);

  return (
    <div className="flex flex-col space-y-4 bg-green-700 p-2 rounded text-stone-200 text-sm">
      <span>
        To use Screenshot to Code,{" "}
        <a
          className="inline underline hover:opacity-70 cursor-pointer"
          onClick={() => setPricingDialogOpen(true)}
          target="_blank"
        >
          subscribe (100 generations for $15)
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
