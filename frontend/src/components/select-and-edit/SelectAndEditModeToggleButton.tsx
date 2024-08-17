import { GiClick } from "react-icons/gi";
import { useAppStore } from "../../store/app-store";
import { Button } from "../ui/button";
import { useTranslation } from 'react-i18next';

function SelectAndEditModeToggleButton() {
  const { inSelectAndEditMode, toggleInSelectAndEditMode } = useAppStore();
  const { t } = useTranslation();
  return (
    <Button
      onClick={toggleInSelectAndEditMode}
      className="flex items-center gap-x-2 dark:text-white dark:bg-gray-700 regenerate-btn"
      variant={inSelectAndEditMode ? "destructive" : "default"}
    >
      <GiClick className="text-lg" />
      <span>
        {inSelectAndEditMode 
          ? t('selectAndEdit.selectAndEdit.exitMode') 
          : t('selectAndEdit.selectAndEdit.enterMode')}
      </span>
    </Button>
  );
}

export default SelectAndEditModeToggleButton;
