import { useTranslation } from 'react-i18next';
import { URLS } from "../../urls";

function TipLink() {
  const { t } = useTranslation();
  return (
    <a
      className="text-xs underline text-gray-500 text-right"
      href={URLS.tips}
      target="_blank"
      rel="noopener"
    >
      {t('messages.tipLink.text')}
    </a>
  );
}

export default TipLink;
