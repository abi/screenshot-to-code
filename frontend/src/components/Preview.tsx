import { useState } from "react";

interface Props {
  code: string;
}

function Preview({ code }: Props) {
  const [blobUrl, setBlobUrl] = useState("");

  const createBlobUrl = () => {
    const blob = new Blob([code], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
  };

  return (
    <div className="w-[704px]">
      <iframe
        title="Iframe Example"
        srcDoc={code}
        className="border-[5px] border-black rounded-[33px] p-4 shadow-lg 
        transform scale-[0.8] origin-top-left w-[1280px] h-[832px]"
      ></iframe>
      <a onClick={createBlobUrl} href={blobUrl} download="index.html">
        Download code
      </a>
    </div>
  );
}
export default Preview;
