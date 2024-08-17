import { useTranslation } from 'react-i18next';

export function PicoBadge() {
  const { t } = useTranslation();
  return (
    <>
      <a
        href="https://screenshot-to-code.canny.io/feature-requests"
        target="_blank"
      >
        <div
          className="fixed z-50 bottom-16 right-5 rounded-md shadow bg-black
         text-white px-4 text-xs py-3 cursor-pointer"
        >
           {t('messages.picoBadge.featureRequests')}
        </div>
      </a>
      <a href="https://picoapps.xyz?ref=screenshot-to-code" target="_blank">
        <div
          className="fixed z-50 bottom-5 right-5 rounded-md shadow text-black
         bg-white px-4 text-xs py-3 cursor-pointer"
        >
           {t('messages.picoBadge.openSourceProject')}
        </div>
      </a>
    </>
  );
}
