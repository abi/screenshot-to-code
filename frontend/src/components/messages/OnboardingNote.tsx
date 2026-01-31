import { useStore } from "../../store/store";
import { FaArrowRight, FaCode } from "react-icons/fa";

export function OnboardingNote() {
  const setPricingDialogOpen = useStore((state) => state.setPricingDialogOpen);

  return (
    <div
      className="flex flex-col bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-xl text-white shadow-lg cursor-pointer
        hover:from-blue-700 hover:to-indigo-700 transition-all group"
      onClick={() => setPricingDialogOpen(true)}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-white/20 rounded-lg">
          <FaCode className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm mb-1">
            Ready to turn designs into code?
          </p>
          <p className="text-blue-100 text-xs mb-2">
            Subscribe to start generating production-ready code from any
            screenshot or design.
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-white/90 group-hover:text-white">
            View plans{" "}
            <FaArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  );
}
