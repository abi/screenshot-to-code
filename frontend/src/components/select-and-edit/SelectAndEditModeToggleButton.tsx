import { GiClick } from "react-icons/gi";
import { useAppStore } from "../../store/app-store";
import { Button } from "../ui/button";

function SelectAndEditModeToggleButton() {
  const { inSelectAndEditMode, toggleInSelectAndEditMode } = useAppStore();

  return (
    <Button
      onClick={toggleInSelectAndEditMode}
      className="flex items-center gap-x-2 dark:text-white dark:bg-gray-700 regenerate-btn"
      variant={inSelectAndEditMode ? "destructive" : "default"}
    >
      <GiClick className="text-lg" />
      <span>
        {inSelectAndEditMode ? "Exit selection mode" : "Select and update"}
      </span>
    </Button>
  );
}

export default SelectAndEditModeToggleButton;
