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

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(files[index].preview);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadedDataUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const { getRootProps, getInputProps, isFocused, isDragAccept, isDragReject } =
    useDropzone({
      maxFiles: 10,
      maxSize: 1024 * 1024 * 20, // 20 MB per file
      accept: {
        // Image formats
        "image/png": [".png"],
        "image/jpeg": [".jpeg"],
        "image/jpg": [".jpg"],
        // Video formats (only allow single video)
        "video/quicktime": [".mov"],
        "video/mp4": [".mp4"],
        "video/webm": [".webm"],
      },
      onDrop: (acceptedFiles) => {
        // Check if any file is a video - videos must be uploaded alone
        const hasVideo = acceptedFiles.some((file) =>
          file.type.startsWith("video/")
        );
        if (hasVideo && acceptedFiles.length > 1) {
          toast.error("Videos must be uploaded individually, not with other files");
          return;
        }

        // For images, append to existing files (up to 10 total)
        const isVideo = hasVideo;
        if (!isVideo && files.length > 0 && uploadedInputMode === "image") {
          const totalFiles = files.length + acceptedFiles.length;
          if (totalFiles > 10) {
            toast.error("Maximum 10 images allowed");
            acceptedFiles = acceptedFiles.slice(0, 10 - files.length);
          }
        }

        // Set up the preview thumbnail images
        const newFiles = acceptedFiles.map((file: File) =>
          Object.assign(file, {
            preview: URL.createObjectURL(file),
          })
        ) as FileWithPreview[];

        // Convert images to data URLs and store them (don't trigger generation yet)
        Promise.all(acceptedFiles.map((file) => fileToDataURL(file)))
          .then((dataUrls) => {
            if (dataUrls.length > 0) {
              const inputMode = (dataUrls[0] as string).startsWith("data:video")
                ? "video"
                : "image";

              if (inputMode === "video" || uploadedInputMode === "video" || files.length === 0) {
                // For videos or first upload, replace all files
                setFiles(newFiles);
                setUploadedDataUrls(dataUrls.map((dataUrl) => dataUrl as string));
              } else {
                // For additional images, append to existing
                setFiles((prev) => [...prev, ...newFiles]);
                setUploadedDataUrls((prev) => [...prev, ...dataUrls.map((dataUrl) => dataUrl as string)]);
              }
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
            Drag & drop screenshots here, <br />
            or click to upload (up to 10 images)
          </p>
        </div>
      )}

      {hasUploadedFile && (
        <div className="flex flex-col items-center gap-4 w-4/5 mx-auto">
          {/* Image/Video Preview */}
          {uploadedInputMode === "video" ? (
            <div className="relative w-full max-w-2xl">
              <video
                src={files[0]?.preview}
                className="w-full h-auto max-h-[500px] object-contain rounded-lg"
                controls
              />
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
                aria-label="Remove video"
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
          ) : (
            <div className="w-full max-w-4xl">
              {/* Multi-image grid */}
              <div className={`grid gap-3 ${files.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : files.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
                {files.map((file, index) => (
                  <div key={file.preview} className="relative group">
                    <img
                      src={file.preview}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-auto max-h-[300px] object-contain rounded-lg bg-gray-100"
                    />
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Remove image ${index + 1}`}
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
                    {files.length > 1 && (
                      <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {/* Add more images button */}
              {files.length < 10 && (
                <div className="mt-3 flex justify-center gap-2">
                  <div {...getRootProps({ className: 'cursor-pointer' })}>
                    <input {...getInputProps()} />
                    <button
                      type="button"
                      className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      + Add more screenshots ({files.length}/10)
                    </button>
                  </div>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={handleClear}
                    className="text-sm text-red-500 hover:text-red-700 underline"
                  >
                    Clear all
                  </button>
                </div>
              )}
              {files.length >= 10 && (
                <div className="mt-3 flex justify-center">
                  <button
                    onClick={handleClear}
                    className="text-sm text-red-500 hover:text-red-700 underline"
                  >
                    Clear all images
                  </button>
                </div>
              )}
            </div>
          )}

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
