import useThrottle from "../hooks/useThrottle";

interface Props {
  code: string;
}

function Preview({ code }: Props) {
  const throttledCode = useThrottle(code, 200);

  return (
    <div className="w-[704px]">
      <iframe
        title="Preview"
        srcDoc={throttledCode}
        className="border-[4px] border-black rounded-[20px] shadow-lg 
        transform scale-[0.8] origin-top-left w-[1280px] h-[832px]"
      ></iframe>
    </div>
  );
}
export default Preview;
