import { useStore } from "../../store/store";

export function OnboardingNote() {
  const setPricingDialogOpen = useStore((state) => state.setPricingDialogOpen);

  return (
    <div className="flex flex-col space-y-4 bg-green-700 p-2 rounded text-stone-200 text-sm">
      <span>
        <a
          className="inline underline hover:opacity-70 cursor-pointer"
          onClick={() => setPricingDialogOpen(true)}
          target="_blank"
        >
          Subscribe to get started
        </a>
      </span>
    </div>
  );
}
