import { useState, useEffect, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import { URLS } from "../urls";
import ScreenRecorder from "./recording/ScreenRecorder";
import { ScreenRecorderState } from "../types";

const baseStyle = {
  flex: 1,
  width: "85%",
  margin: "0 auto",
  minHeight: "420px",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  padding: "32px",
  borderWidth: 2,
  borderRadius: 16,
  borderColor: "rgba(99, 102, 241, 0.3)",
  borderStyle: "dashed",
  backgroundColor: "rgba(249, 250, 251, 0.8)",
  color: "#64748b",
  outline: "none",
  transition: "all 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
  backdropFilter: "blur(8px)",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
};

const focusedStyle = {
  borderColor: "#6366f1",
  backgroundColor: "rgba(99, 102, 241, 0.05)",
  boxShadow: "0 0 0 4px rgba(99, 102, 241, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.05)",
};

const acceptStyle = {
  borderColor: "#22c55e",
  backgroundColor: "rgba(34, 197, 94, 0.05)",
  boxShadow: "0 0 0 4px rgba(34, 197, 94, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.05)",
};

const rejectStyle = {
  borderColor: "#ef4444",
  backgroundColor: "rgba(239, 68, 68, 0.05)",
  boxShadow: "0 0 0 4px rgba(239, 68, 68, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.05)",
};

function fileToDataURL(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

type FileWithPreview = {
  preview: string;
} & File;

interface Props {
  setReferenceImages: (
    referenceImages: string[],
    inputMode: "image" | "video"
  ) => void;
}

function ImageUpload({ setReferenceImages }: Props) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [screenRecorderState, setScreenRecorderState] =
    useState<ScreenRecorderState>(ScreenRecorderState.INITIAL);

  const { getRootProps, getInputProps, isFocused, isDragAccept, isDragReject } =
    useDropzone({
      maxFiles: 1,
      maxSize: 1024 * 1024 * 20, // 20 MB
      accept: {
        // Image formats
        "image/png": [".png"],
        "image/jpeg": [".jpeg"],
        "image/jpg": [".jpg"],
        // Video formats
        "video/quicktime": [".mov"],
        "video/mp4": [".mp4"],
        "video/webm": [".webm"],
      },
      onDrop: (acceptedFiles) => {
        // Set up the preview thumbnail images
        setFiles(
          acceptedFiles.map((file: File) =>
            Object.assign(file, {
              preview: URL.createObjectURL(file),
            })
          ) as FileWithPreview[]
        );

        // Convert images to data URLs and set the prompt images state
        Promise.all(acceptedFiles.map((file) => fileToDataURL(file)))
          .then((dataUrls) => {
            if (dataUrls.length > 0) {
              setReferenceImages(
                dataUrls.map((dataUrl) => dataUrl as string),
                (dataUrls[0] as string).startsWith("data:video")
                  ? "video"
                  : "image"
              );
            }
          })
          .catch((error) => {
            toast.error("Error reading files" + error);
            console.error("Error reading files:", error);
          });
      },
      onDropRejected: (rejectedFiles) => {
        toast.error(rejectedFiles[0].errors[0].message);
      },
    });

  useEffect(() => {
    return () => files.forEach((file) => URL.revokeObjectURL(file.preview));
  }, [files]);

  const style = useMemo(
    () => ({
      ...baseStyle,
      ...(isFocused ? focusedStyle : {}),
      ...(isDragAccept ? acceptStyle : {}),
      ...(isDragReject ? rejectStyle : {}),
    }),
    [isFocused, isDragAccept, isDragReject]
  );

  return (
    <section className="container">
      {screenRecorderState === ScreenRecorderState.INITIAL && (
        <div {...getRootProps({ style: style as React.CSSProperties })}>
          <input {...getInputProps()} className="file-input" />
          <div className="flex flex-col items-center gap-4">
            {/* Upload Icon */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-slate-700 dark:text-slate-300 text-lg font-medium mb-1">
                Drop your screenshot here
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                or click to browse files
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
              <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">PNG</span>
              <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">JPG</span>
              <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">MP4</span>
              <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md">MOV</span>
            </div>
          </div>
        </div>
      )}
      {screenRecorderState === ScreenRecorderState.INITIAL && (
        <div className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6 max-w-md mx-auto">
          <p className="leading-relaxed">
            Upload a screen recording (.mp4, .mov) or record your screen to clone
            a whole app (experimental).{" "}
            <a
              className="text-indigo-500 hover:text-indigo-600 underline underline-offset-2 transition-colors"
              href={URLS["intro-to-video"]}
              target="_blank"
            >
              Learn more
            </a>
          </p>
        </div>
      )}
      <ScreenRecorder
        screenRecorderState={screenRecorderState}
        setScreenRecorderState={setScreenRecorderState}
        generateCode={setReferenceImages}
      />
    </section>
  );
}

export default ImageUpload;
