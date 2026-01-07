import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import { URLS } from "../urls";
import ScreenRecorder from "./recording/ScreenRecorder";
import { ScreenRecorderState } from "../types";

const baseStyle = {
  flex: 1,
  width: "80%",
  margin: "0 auto",
  minHeight: "400px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  borderWidth: 2,
  borderRadius: 2,
  borderColor: "#eeeeee",
  borderStyle: "dashed",
  backgroundColor: "#fafafa",
  color: "#bdbdbd",
  outline: "none",
  transition: "border .24s ease-in-out",
};

const focusedStyle = {
  borderColor: "#2196f3",
};

const acceptStyle = {
  borderColor: "#00e676",
};

const rejectStyle = {
  borderColor: "#ff1744",
};

// TODO: Move to a separate file
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
    inputMode: "image" | "video",
    textPrompt?: string
  ) => void;
  onUploadStateChange?: (hasUpload: boolean) => void;
}

function ImageUpload({ setReferenceImages, onUploadStateChange }: Props) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploadedDataUrls, setUploadedDataUrls] = useState<string[]>([]);
  const [uploadedInputMode, setUploadedInputMode] = useState<
    "image" | "video"
  >("image");
  const [textPrompt, setTextPrompt] = useState("");
  const [showTextPrompt, setShowTextPrompt] = useState(false);
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // TODO: Switch to Zustand
  const [screenRecorderState, setScreenRecorderState] =
    useState<ScreenRecorderState>(ScreenRecorderState.INITIAL);

  const hasUploadedFile = uploadedDataUrls.length > 0;

  // Notify parent of upload state changes
  useEffect(() => {
    onUploadStateChange?.(hasUploadedFile);
  }, [hasUploadedFile, onUploadStateChange]);

  const handleGenerate = useCallback(() => {
    if (uploadedDataUrls.length > 0) {
      setReferenceImages(uploadedDataUrls, uploadedInputMode, textPrompt);
    }
  }, [uploadedDataUrls, uploadedInputMode, textPrompt, setReferenceImages]);

  // Global Enter key listener for generating when image is uploaded
  useEffect(() => {
    if (!hasUploadedFile) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        // Don't fire if textarea is focused (it has its own handler)
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

        // Convert images to data URLs and store them (don't trigger generation yet)
        Promise.all(acceptedFiles.map((file) => fileToDataURL(file)))
          .then((dataUrls) => {
            if (dataUrls.length > 0) {
              const inputMode = (dataUrls[0] as string).startsWith("data:video")
                ? "video"
                : "image";
              setUploadedDataUrls(dataUrls.map((dataUrl) => dataUrl as string));
              setUploadedInputMode(inputMode);
              // Focus the text input after upload
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

  const style = useMemo(
    () => ({
      ...baseStyle,
      ...(isFocused ? focusedStyle : {}),
      ...(isDragAccept ? acceptStyle : {}),
      ...(isDragReject ? rejectStyle : {}),
    }),
    [isFocused, isDragAccept, isDragReject]
  );

  // Screen recorder callback - wrap to include empty text prompt
  const handleScreenRecorderGenerate = (
    images: string[],
    inputMode: "image" | "video"
  ) => {
    setReferenceImages(images, inputMode, "");
  };

  return (
    <section className="container">
      {screenRecorderState === ScreenRecorderState.INITIAL && !hasUploadedFile && (
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        <div {...getRootProps({ style: style as any })}>
          <input {...getInputProps()} className="file-input" />
          <p className="text-slate-700 text-lg">
            Drag & drop a screenshot here, <br />
            or click to upload
          </p>
        </div>
      )}

      {hasUploadedFile && (
        <div className="flex flex-col items-center gap-4 w-4/5 mx-auto">
          {/* Image/Video Preview */}
          <div className="relative w-full max-w-2xl">
            {uploadedInputMode === "video" ? (
              <video
                src={files[0]?.preview}
                className="w-full h-auto max-h-[500px] object-contain rounded-lg"
                controls
              />
            ) : (
              <img
                src={files[0]?.preview}
                alt="Uploaded screenshot"
                className="w-full h-auto max-h-[500px] object-contain rounded-lg"
              />
            )}
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
              aria-label="Remove image"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-600"
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

          {/* Text Prompt Toggle/Input */}
          {!showTextPrompt ? (
            <button
              onClick={() => {
                setShowTextPrompt(true);
                setTimeout(() => textInputRef.current?.focus(), 50);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              (optional) add text prompt
            </button>
          ) : (
            <div className="w-full max-w-lg">
              <textarea
                ref={textInputRef}
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe any specific requirements or changes..."
                className="w-full p-3 text-sm border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                rows={3}
              />
            </div>
          )}

          {/* Generate Button */}
          <div className="flex flex-col items-center gap-1 w-full max-w-md">
            <button
              onClick={handleGenerate}
              className="w-full py-3 px-6 bg-black text-white font-medium rounded-md hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Generate
            </button>
            <p className="text-xs text-gray-400">
              Press Enter to generate
            </p>
          </div>
        </div>
      )}

      {screenRecorderState === ScreenRecorderState.INITIAL && !hasUploadedFile && (
        <div className="text-center text-sm text-slate-800 mt-4">
          Upload a screen recording (.mp4, .mov) or record your screen to clone
          a whole app (experimental).{" "}
          <a
            className="underline"
            href={URLS["intro-to-video"]}
            target="_blank"
          >
            Learn more.
          </a>
        </div>
      )}
      {!hasUploadedFile && (
        <ScreenRecorder
          screenRecorderState={screenRecorderState}
          setScreenRecorderState={setScreenRecorderState}
          generateCode={handleScreenRecorderGenerate}
        />
      )}
    </section>
  );
}

export default ImageUpload;
