import React from "react";
import { useTranslation } from 'react-i18next';

interface DeprecationMessageProps {}

const DeprecationMessage: React.FC<DeprecationMessageProps> = () => {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg p-2 bg-fuchsia-200">
      <p className="text-gray-800 text-sm">
        {t('messages.deprecationMessage')}
      </p>
    </div>
  );
};

export default DeprecationMessage;