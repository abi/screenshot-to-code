import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import { Button } from "../../ui/button";
import { ScreenRecorderState } from "../../../types";
import ScreenRecorder from "../../recording/ScreenRecorder";

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result.startsWith("data:application/octet-stream") && file.type) {
        const correctedResult = result.replace(
          "data:application/octet-stream",
          `data:${file.type}`
        );
        resolve(correctedResult);
      } else {
        resolve(result);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

type FileWithPreview = {
  preview: string;
} & File;

interface Props {
  doCreate: (
    referenceImages: string[],
    inputMode: "image" | "video",
    textPrompt?: string
  ) => void;
}

function UploadTab({ doCreate }: Props) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploadedDataUrls, setUploadedDataUrls] = useState<string[]>([]);
  const [uploadedInputMode, setUploadedInputMode] = useState<
    "image" | "video"
  >("image");
  const [textPrompt, setTextPrompt] = useState("");
  const [showTextPrompt, setShowTextPrompt] = useState(false);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const [screenRecorderState, setScreenRecorderState] =
    useState<ScreenRecorderState>(ScreenRecorderState.INITIAL);

  const hasUploadedFile = uploadedDataUrls.length > 0;

  const handleGenerate = useCallback(() => {
    if (uploadedDataUrls.length > 0) {
      doCreate(uploadedDataUrls, uploadedInputMode, textPrompt);
    }
  }, [uploadedDataUrls, uploadedInputMode, textPrompt, doCreate]);

  useEffect(() => {
    if (!hasUploadedFile) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        if (document.activeElement === textInputRef.current) return;
        e.preventDefault();
        handleGenerate();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [hasUploadedFile, handleGenerate]);

  const handleClear = () => {
    setUploadedDataUrls([]);
    setFiles([]);
    setTextPrompt("");
    setShowTextPrompt(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const { getRootProps, getInputProps, isFocused, isDragAccept, isDragReject } =
    useDropzone({
      maxFiles: 1,
      maxSize: 1024 * 1024 * 20,
      accept: {
        "image/png": [".png"],
        "image/jpeg": [".jpeg"],
        "image/jpg": [".jpg"],
        "video/quicktime": [".mov"],
        "video/mp4": [".mp4"],
        "video/webm": [".webm"],
      },
      onDrop: (acceptedFiles) => {
        setFiles(
          acceptedFiles.map((file: File) =>
            Object.assign(file, {
              preview: URL.createObjectURL(file),
            })
          ) as FileWithPreview[]
        );

        const firstFile = acceptedFiles[0];
        const isVideo =
          firstFile?.type?.startsWith("video/") ||
          [".mp4", ".mov", ".webm"].some((ext) =>
            firstFile?.name?.toLowerCase().endsWith(ext)
          );

        Promise.all(acceptedFiles.map((file) => fileToDataURL(file)))
          .then((dataUrls) => {
            if (dataUrls.length > 0) {
              const inputMode =
                isVideo || (dataUrls[0] as string).startsWith("data:video")
                  ? "video"
                  : "image";
              setUploadedDataUrls(dataUrls as string[]);
              setUploadedInputMode(inputMode);
              setTimeout(() => textInputRef.current?.focus(), 100);
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

  const style = useMemo(() => {
    const baseStyle: React.CSSProperties = {
      flex: 1,
      width: "100%",
      minHeight: "320px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      borderWidth: 2,
      borderRadius: 12,
      borderColor: "#e5e7eb",
      borderStyle: "dashed",
      backgroundColor: "#fafafa",
      color: "#6b7280",
      outline: "none",
      transition: "all 0.2s ease-in-out",
      cursor: "pointer",
    };

    if (isFocused) {
      return { ...baseStyle, borderColor: "#3b82f6", backgroundColor: "#eff6ff" };
    }
    if (isDragAccept) {
      return { ...baseStyle, borderColor: "#22c55e", backgroundColor: "#f0fdf4" };
    }
    if (isDragReject) {
      return { ...baseStyle, borderColor: "#ef4444", backgroundColor: "#fef2f2" };
    }
    return baseStyle;
  }, [isFocused, isDragAccept, isDragReject]);

  const handleScreenRecorderGenerate = (
    images: string[],
    inputMode: "image" | "video"
  ) => {
    doCreate(images, inputMode, "");
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {screenRecorderState === ScreenRecorderState.INITIAL && !hasUploadedFile && (
        <div {...getRootProps({ style })}>
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-400"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-gray-700 font-medium">
                Drop a screenshot or video here
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Supports PNG, JPG, MP4, MOV, WebM (max 20MB, 30s video)
            </p>
          </div>
        </div>
      )}

      {hasUploadedFile && (
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="relative w-full max-w-2xl">
            {uploadedInputMode === "video" ? (
              <video
                src={files[0]?.preview}
                className="w-full h-auto max-h-[400px] object-contain rounded-lg border border-gray-200"
                controls
              />
            ) : (
              <img
                src={files[0]?.preview}
                alt="Uploaded screenshot"
                className="w-full h-auto max-h-[400px] object-contain rounded-lg border border-gray-200"
              />
            )}
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-md hover:bg-gray-100 transition-colors"
              aria-label="Remove file"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {!showTextPrompt ? (
            <button
              onClick={() => {
                setShowTextPrompt(true);
                setTimeout(() => textInputRef.current?.focus(), 50);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Add instructions (optional)
            </button>
          ) : (
            <div className="w-full max-w-lg">
              <textarea
                ref={textInputRef}
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe any specific requirements..."
                className="w-full p-3 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
                rows={2}
              />
            </div>
          )}

          <div className="flex flex-col items-center gap-1 w-full max-w-md">
            <Button onClick={handleGenerate} className="w-full" size="lg">
              Generate Code
            </Button>
            <p className="text-xs text-gray-400">Press Enter to generate</p>
          </div>
        </div>
      )}

      {!hasUploadedFile && (
        <div className="flex flex-col items-center gap-3">
          {screenRecorderState === ScreenRecorderState.INITIAL && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="h-px w-12 bg-gray-300" />
              <span>or</span>
              <div className="h-px w-12 bg-gray-300" />
            </div>
          )}
          <ScreenRecorder
            screenRecorderState={screenRecorderState}
            setScreenRecorderState={setScreenRecorderState}
            generateCode={handleScreenRecorderGenerate}
          />
        </div>
      )}
    </div>
  );
}

export default UploadTab;
