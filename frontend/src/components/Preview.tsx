import classNames from "classnames";
import useThrottle from "../hooks/useThrottle";

interface Props {
  code: string;
  device: "mobile" | "desktop";
}

function Preview({ code, device }: Props) {
  const throttledCode = useThrottle(code, 200);

  return (
    <div className="flex justify-center mx-2">
      <iframe
        id={`preview-${device}`}
        title="Preview"
        srcDoc={throttledCode}
        className={classNames(
          "border-[4px] border-black rounded-[20px] shadow-lg",
          "transform scale-[0.9] origin-top",
          {
            "w-full h-[832px]": device === "desktop",
            "w-[400px] h-[832px]": device === "mobile",
          }
        )}
      ></iframe>
    </div>
  );
}
export default Preview;
