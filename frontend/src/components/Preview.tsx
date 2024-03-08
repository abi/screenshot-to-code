import { useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { FaSearch } from "react-icons/fa";
// import useThrottle from "../hooks/useThrottle";

interface Props {
  code: string;
  device: "mobile" | "desktop";
}

function Preview({ code, device }: Props) {
  const throttledCode = code;
  // Temporary disable throttling for the preview not updating when the code changes
  // useThrottle(code, 200);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentDocument) {
      iframe.contentDocument.open();
      iframe.contentDocument.write(throttledCode);
      iframe.contentDocument.close();

      setTimeout(() => {
        const body = iframe.contentDocument!.body;
        if (body) {
          const bgColor = window.getComputedStyle(body).backgroundColor;
          setBackgroundColor(bgColor);
        }
      }, 5);
    }
  }, [throttledCode]);

  return (
    <div className="flex justify-center mx-2">
      <div
        className={classNames(
          "border-[4px] border-black rounded-[20px] shadow-lg",
          "transform scale-[0.9] origin-top",

          {
            "w-full h-[832px]": device === "desktop",
            "w-[400px] h-[832px]": device === "mobile",
          }
        )}
        style={{ backgroundColor: `${backgroundColor}` }}
      >
        {device === "mobile" ? (
          <div className="bg-black h-[16px] w-[70px] rounded-full mx-auto my-2.5"></div>
        ) : (
          <div className="bg-gray-200 rounded-t-[20px] h-[64px] p-4 flex justify-between items-center">
            <div className="flex items-center">
              <div className="flex items-center">
                <button className="w-4 h-4 bg-gray-400 rounded-full mr-3 ml-3"></button>
                <button className="w-4 h-4 bg-gray-400 rounded-full mr-3"></button>
                <button className="w-4 h-4 bg-gray-400 rounded-full"></button>
              </div>
            </div>
            <div className="mx-auto">
              <FaSearch className="absolute ml-3 mt-3" />
              <input
                type="text"
                disabled
                style={{ width: "500px" }}
                placeholder="https://my-app.cool"
                className="py-2 px-10 bg-gray-100 text-black rounded-full focus:outline-none focus:shadow-outline"
              />
            </div>
          </div>
        )}
        <iframe
          id={`preview-${device}`}
          ref={iframeRef}
          title="Preview"
          className={classNames("rounded-[20px] ", {
            "w-full h-[760px]": device === "desktop",
            "w-[392px] h-[788px]": device === "mobile",
          })}
        ></iframe>
      </div>
    </div>
  );
}

export default Preview;
