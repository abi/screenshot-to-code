import { Button } from "../../ui/button";
import { useStore } from "../../../store/store";

function HistoryTab() {
  const setProjectsHistoryDialogOpen = useStore(
    (state) => state.setProjectsHistoryDialogOpen
  );

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full max-w-lg">
        <div className="flex flex-col gap-6 p-8 border border-gray-200 rounded-xl bg-gray-50/50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400"
              >
                <path d="M3 12a9 9 0 1 0 9-9" />
                <polyline points="3 8 3 12 7 12" />
                <path d="M12 7v5l4 2" />
              </svg>
            </div>

            <div className="text-center">
              <h3 className="text-gray-700 font-medium">Your History</h3>
              <p className="text-sm text-gray-500">
                Load a previous generation into the editor.
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={() => setProjectsHistoryDialogOpen(true)}
          >
            View History
          </Button>
        </div>
      </div>
    </div>
  );
}

export default HistoryTab;
