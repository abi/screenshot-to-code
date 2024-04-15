import PricingDialog from "./payments/PricingDialog";

export function PicoBadge() {
  return (
    <>
      <div>
        <PricingDialog />
      </div>
      <a
        href="https://screenshot-to-code.canny.io/feature-requests"
        target="_blank"
      >
        <div
          className="fixed z-50 bottom-16 right-5 rounded-md shadow bg-black
         text-white px-4 text-xs py-3 cursor-pointer"
        >
          feedback
        </div>
      </a>
    </>
  );
}
