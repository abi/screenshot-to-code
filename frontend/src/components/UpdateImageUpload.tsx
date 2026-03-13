import { useRef } from "react";
import { toast } from "react-hot-toast";
import { Cross2Icon } from "@radix-ui/react-icons";
import { LuPlus } from "react-icons/lu";

const MAX_UPDATE_IMAGES = 5;
const MAX_UPDATE_VIDEOS = 1;

// Helper function to convert file to data URL
function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

function isVideoFile(file: File): boolean {
  return (
    file.type.startsWith("video/") ||
    [".mp4", ".mov", ".webm"].some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    )
  );
}

interface Props {
  updateImages: string[];
  setUpdateImages: (images: string[]) => void;
  updateVideos: string[];
  setUpdateVideos: (videos: string[]) => void;
}

export function UpdateImagePreview({
  updateImages,
  setUpdateImages,
  updateVideos,
  setUpdateVideos,
}: Props) {
  const removeImage = (index: number) => {
    const newImages = updateImages.filter((_, i) => i !== index);
    setUpdateImages(newImages);
  };

  const removeVideo = (index: number) => {
    const newVideos = updateVideos.filter((_, i) => i !== index);
    setUpdateVideos(newVideos);
  };

  if (updateImages.length === 0 && updateVideos.length === 0) return null;

  return (
    <div className="px-3 pt-3">
      <div className="flex flex-wrap gap-2 py-1">
        {updateVideos.map((video, index) => (
          <div
            key={`video-${index}`}
            className="relative flex-shrink-0 group overflow-visible"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <video
                src={video}
                className="max-h-full max-w-full object-contain"
                muted
                preload="metadata"
              />
            </div>
            <button
              onClick={() => removeVideo(index)}
              className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-gray-900 text-white opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-red-600 dark:border-zinc-900"
            >
              <Cross2Icon className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
        {updateImages.map((image, index) => (
          <div
            key={`image-${index}`}
            className="relative flex-shrink-0 group overflow-visible"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
              <img
                src={image}
                alt={`Reference ${index + 1}`}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <button
              onClick={() => removeImage(index)}
              className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-gray-900 text-white opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-red-600 dark:border-zinc-900"
            >
              <Cross2Icon className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function UpdateImageUpload({
  updateImages,
  setUpdateImages,
  updateVideos,
  setUpdateVideos,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRemaining = Math.max(0, MAX_UPDATE_IMAGES - updateImages.length);
  const videoRemaining = Math.max(0, MAX_UPDATE_VIDEOS - updateVideos.length);
  const isAtLimit = imageRemaining === 0 && videoRemaining === 0;

  const handleButtonClick = () => {
    if (isAtLimit) {
      toast.error(
        `You've reached the limit of ${MAX_UPDATE_IMAGES} reference images and ${MAX_UPDATE_VIDEOS} video. Remove one to add another.`
      );
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (files) {
      try {
        const allFiles = Array.from(files);
        const videoFiles = allFiles.filter(isVideoFile);
        const imageFiles = allFiles.filter((f) => !isVideoFile(f));

        // Handle video files
        if (videoFiles.length > 0) {
          if (updateVideos.length >= MAX_UPDATE_VIDEOS) {
            toast.error(
              `You've reached the limit of ${MAX_UPDATE_VIDEOS} reference video. Remove it to add another.`
            );
          } else {
            const videoSlotsRemaining = MAX_UPDATE_VIDEOS - updateVideos.length;
            let videosToAdd = videoFiles;
            if (videosToAdd.length > videoSlotsRemaining) {
              toast.error(
                `Only ${videoSlotsRemaining} more video will be added to stay within the ${MAX_UPDATE_VIDEOS}-video limit.`
              );
              videosToAdd = videosToAdd.slice(0, videoSlotsRemaining);
            }
            const newVideoPromises = videosToAdd.map((file) =>
              fileToDataURL(file)
            );
            const newVideos = await Promise.all(newVideoPromises);
            setUpdateVideos([...updateVideos, ...newVideos]);
          }
        }

        // Handle image files
        if (imageFiles.length > 0) {
          if (updateImages.length >= MAX_UPDATE_IMAGES) {
            toast.error(
              `You've reached the limit of ${MAX_UPDATE_IMAGES} reference images. Remove one to add another.`
            );
          } else {
            const imageSlotsRemaining =
              MAX_UPDATE_IMAGES - updateImages.length;
            let imagesToAdd = imageFiles;
            if (imagesToAdd.length > imageSlotsRemaining) {
              toast.error(
                `Only ${imageSlotsRemaining} more image${
                  imageSlotsRemaining === 1 ? "" : "s"
                } will be added to stay within the ${MAX_UPDATE_IMAGES}-image limit.`
              );
              imagesToAdd = imagesToAdd.slice(0, imageSlotsRemaining);
            }
            const newImagePromises = imagesToAdd.map((file) =>
              fileToDataURL(file)
            );
            const newImages = await Promise.all(newImagePromises);
            setUpdateImages([...updateImages, ...newImages]);
          }
        }

        e.target.value = "";
      } catch (error) {
        toast.error("Error reading files");
        console.error("Error reading files:", error);
      }
    }
  };

  return (
    <div className="relative inline-block">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,video/mp4,video/quicktime,video/webm"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isAtLimit}
        className={`p-2 rounded-lg transition-colors ${
          isAtLimit
            ? "text-gray-300 dark:text-zinc-600 cursor-not-allowed"
            : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800"
        }`}
        title={
          isAtLimit
            ? `Limit reached (${MAX_UPDATE_IMAGES} images, ${MAX_UPDATE_VIDEOS} video)`
            : "Add images or video"
        }
      >
        <LuPlus className="w-[18px] h-[18px]" />
      </button>
    </div>
  );
}

export default UpdateImageUpload;
