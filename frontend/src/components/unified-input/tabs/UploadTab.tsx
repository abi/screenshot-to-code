import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import { Cross2Icon, ImageIcon } from "@radix-ui/react-icons";
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

const MAX_FILES = 5;

const isVideoFile = (file: File) =>
  file.type.startsWith("video/") ||
  [".mp4", ".mov", ".webm"].some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );

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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const filesRef = useRef<FileWithPreview[]>([]);
  const [screenRecorderState, setScreenRecorderState] =
    useState<ScreenRecorderState>(ScreenRecorderState.INITIAL);

  const hasUploadedFile = uploadedDataUrls.length > 0;
  const remainingSlots = Math.max(0, MAX_FILES - files.length);
  const isAtLimit = remainingSlots === 0;

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
    files.forEach((file) => URL.revokeObjectURL(file.preview));
    setUploadedDataUrls([]);
    setFiles([]);
    setTextPrompt("");
    setShowTextPrompt(false);
    setUploadedInputMode("image");
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleAddFiles = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const incomingHasVideo = acceptedFiles.some(isVideoFile);
      const hasExistingImages = files.length > 0 && uploadedInputMode === "image";

      if (incomingHasVideo && (acceptedFiles.length > 1 || hasExistingImages)) {
        toast.error(
          `Upload either one video or up to ${MAX_FILES} screenshots (not both).`
        );
        return;
      }

      if (uploadedInputMode === "video" && files.length > 0) {
        toast.error("Remove the video to add images.");
        return;
      }

      if (!incomingHasVideo && files.length >= MAX_FILES) {
        toast.error(
          `You’ve reached the limit of ${MAX_FILES} screenshots. Remove one to add another.`
        );
        return;
      }

      let filesToAdd = acceptedFiles;
      if (!incomingHasVideo && files.length + acceptedFiles.length > MAX_FILES) {
        const remainingSlots = MAX_FILES - files.length;
        toast.error(
          `Only ${remainingSlots} more screenshot${
            remainingSlots === 1 ? "" : "s"
          } will be added to stay within the ${MAX_FILES}-screenshot limit.`
        );
        filesToAdd = acceptedFiles.slice(0, remainingSlots);
      }

      const newFiles = filesToAdd.map((file: File) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      ) as FileWithPreview[];

      try {
        const dataUrls = await Promise.all(filesToAdd.map((file) => fileToDataURL(file)));
        if (dataUrls.length === 0) return;

        if (incomingHasVideo) {
          files.forEach((file) => URL.revokeObjectURL(file.preview));
          setFiles(newFiles);
          setUploadedDataUrls(dataUrls as string[]);
          setUploadedInputMode("video");
          setSelectedIndex(0);
        } else {
          setFiles((prev) => [...prev, ...newFiles]);
          setUploadedDataUrls((prev) => [...prev, ...(dataUrls as string[])]);
          setUploadedInputMode("image");
          if (files.length === 0) {
            setSelectedIndex(0);
          }
        }

        setTimeout(() => textInputRef.current?.focus(), 100);
      } catch (error) {
        newFiles.forEach((file) => URL.revokeObjectURL(file.preview));
        toast.error("Error reading files.");
        console.error("Error reading files:", error);
      }
    },
    [files, uploadedInputMode]
  );

  const {
    getRootProps,
    getInputProps,
    isFocused,
    isDragAccept,
    isDragReject,
    isDragActive,
    open,
  } = useDropzone({
    maxFiles: MAX_FILES,
    maxSize: 1024 * 1024 * 20,
    noClick: true,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpeg"],
      "image/jpg": [".jpg"],
      "video/quicktime": [".mov"],
      "video/mp4": [".mp4"],
      "video/webm": [".webm"],
    },
    onDrop: handleAddFiles,
    onDropRejected: (rejectedFiles) => {
      const firstError = rejectedFiles[0]?.errors?.[0];
      if (!firstError) {
        toast.error("Some files were rejected.");
        return;
      }

      if (firstError.code === "file-too-large") {
        toast.error("One or more files exceed the 20MB limit.");
        return;
      }

      if (firstError.code === "file-invalid-type") {
        toast.error("Unsupported file type. Use PNG, JPG, MP4, MOV, or WebM.");
        return;
      }

      if (firstError.code === "too-many-files") {
        toast.error(`You can upload up to ${MAX_FILES} screenshots.`);
        return;
      }

      toast.error(firstError.message);
    },
  });

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    return () => filesRef.current.forEach((file) => URL.revokeObjectURL(file.preview));
  }, []);

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

  const handleRemoveImage = (index: number) => {
    if (uploadedInputMode === "video" || files.length === 1) {
      handleClear();
      return;
    }

    const removed = files[index];
    if (removed) {
      URL.revokeObjectURL(removed.preview);
    }

    setFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadedDataUrls((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndex((prev) => {
      if (prev === index) {
        return Math.max(0, index - 1);
      }
      if (prev > index) {
        return prev - 1;
      }
      return prev;
    });
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {screenRecorderState === ScreenRecorderState.INITIAL && !hasUploadedFile && (
        <div {...getRootProps({ style })} data-testid="upload-dropzone">
          <input data-testid="upload-input" {...getInputProps()} />
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
                Drop up to {MAX_FILES} screenshots or a single video
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Supports PNG, JPG, MP4, MOV, WebM (max 20MB each, 30s video)
            </p>
            <button
              type="button"
              onClick={open}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Browse files
            </button>
          </div>
        </div>
      )}

      {hasUploadedFile && (
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="relative w-full max-w-3xl">
            {uploadedInputMode === "video" ? (
              <div className="relative rounded-lg border border-gray-200 bg-white p-3">
                <video
                  src={files[0]?.preview}
                  className="w-full h-auto max-h-[400px] object-contain rounded-md border border-gray-100"
                  controls
                />
                <button
                  onClick={handleClear}
                  className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-md hover:bg-gray-100 transition-colors"
                  aria-label="Remove video"
                >
                  <Cross2Icon className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            ) : (
              <div
                {...getRootProps({
                  className: `relative rounded-lg border border-gray-200 bg-white p-4 ${
                    isDragActive ? "ring-2 ring-blue-200" : ""
                  }`,
                })}
              >
                <input {...getInputProps()} />
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
                  <span>{`Uploaded Screenshots (${files.length}/${MAX_FILES})`}</span>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear all
                  </button>
                </div>
                <div className="mt-1 text-[11px] text-gray-400">
                  {isAtLimit
                    ? "Limit reached"
                    : `${remainingSlots} remaining`}
                </div>
                <div className="mt-3 rounded-md border border-gray-100 bg-gray-50 p-2">
                  {files[selectedIndex] && (
                    <img
                      src={files[selectedIndex].preview}
                      alt={`Uploaded screenshot ${selectedIndex + 1}`}
                      className="w-full max-h-[280px] object-contain rounded"
                    />
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                  {files.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="relative group flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedIndex(index)}
                        className={`h-14 w-14 rounded-md border overflow-hidden ${
                          selectedIndex === index
                            ? "border-blue-500 ring-2 ring-blue-200"
                            : "border-gray-200"
                        }`}
                        aria-label={`Preview screenshot ${index + 1}`}
                      >
                        <img
                          src={file.preview}
                          alt={`Thumbnail ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute -top-1 -right-1 h-4 w-4 bg-gray-800 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label={`Remove screenshot ${index + 1}`}
                      >
                        <Cross2Icon className="h-2 w-2" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      if (isAtLimit) {
                        toast.error(
                          `You’ve reached the limit of ${MAX_FILES} screenshots. Remove one to add another.`
                        );
                        return;
                      }
                      open();
                    }}
                    disabled={isAtLimit}
                    className={`h-14 w-14 rounded-md border border-dashed flex items-center justify-center flex-shrink-0 ${
                      isAtLimit
                        ? "border-gray-200 text-gray-300 cursor-not-allowed"
                        : "border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400"
                    }`}
                    aria-label="Add more screenshots"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Drag and drop to add more screenshots
                </div>
                {isDragActive && (
                  <div className="absolute inset-0 bg-blue-50/80 border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center pointer-events-none">
                    <p className="text-blue-600 font-medium">Drop to add</p>
                  </div>
                )}
              </div>
            )}
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
            <Button
              onClick={handleGenerate}
              className="w-full"
              size="lg"
              data-testid="upload-generate"
            >
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
