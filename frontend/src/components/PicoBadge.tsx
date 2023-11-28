export function PicoBadge() {
  return (
    <>
      <a href="https://buy.stripe.com/5kAfZt0CX85f9mEbIM" target="_blank">
        <div
          className="fixed z-[100] bottom-5 left-5 rounded-md shadow-lg bg-black
          text-white  px-4 text-xs py-3 cursor-pointer"
        >
          upgrade to business plan ($36/mo) <br />
          export to react, vue, bootstrap and more.
        </div>
      </a>
      <a
        href="https://screenshot-to-code.canny.io/feature-requests"
        target="_blank"
      >
        <div
          className="fixed z-50 bottom-16 right-5 rounded-md shadow bg-black
         text-white px-4 text-xs py-3 cursor-pointer"
        >
          feedback?
        </div>
      </a>
      <a href="https://picoapps.xyz?ref=screenshot-to-code" target="_blank">
        <div
          className="fixed z-50 bottom-5 right-5 rounded-md shadow text-black
         bg-white px-4 text-xs py-3 cursor-pointer"
        >
          an open source project by Pico
        </div>
      </a>
    </>
  );
}
