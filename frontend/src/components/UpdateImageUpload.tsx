import { useRef } from "react";
import { toast } from "react-hot-toast";
import { Cross2Icon } from "@radix-ui/react-icons";
import { LuPlus } from "react-icons/lu";

const MAX_UPDATE_IMAGES = 5;

// Helper function to convert file to data URL
function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

interface Props {
  updateImages: string[];
  setUpdateImages: (images: string[]) => void;
}

export function UpdateImagePreview({ updateImages, setUpdateImages }: Props) {
  const removeImage = (index: number) => {
    const newImages = updateImages.filter((_, i) => i !== index);
    setUpdateImages(newImages);
  };

  if (updateImages.length === 0) return null;

  return (
    <div className="px-3 pt-3">
      <div className="flex gap-2 overflow-x-auto py-1">
        {updateImages.map((image, index) => (
          <div key={index} className="relative flex-shrink-0 group overflow-visible">
            <img
              src={image}
              alt={`Reference ${index + 1}`}
              className="h-14 w-14 rounded-lg border border-gray-200 object-cover shadow-sm dark:border-zinc-700"
            />
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

function UpdateImageUpload({ updateImages, setUpdateImages }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const remaining = Math.max(0, MAX_UPDATE_IMAGES - updateImages.length);
  const isAtLimit = remaining === 0;


  const handleButtonClick = () => {
    if (isAtLimit) {
      toast.error(
        `You’ve reached the limit of ${MAX_UPDATE_IMAGES} reference images. Remove one to add another.`
      );
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      try {
        if (updateImages.length >= MAX_UPDATE_IMAGES) {
          toast.error(
            `You’ve reached the limit of ${MAX_UPDATE_IMAGES} reference images. Remove one to add another.`
          );
          return;
        }

        const remainingSlots = MAX_UPDATE_IMAGES - updateImages.length;
        let filesToAdd = Array.from(files);
        if (filesToAdd.length > remainingSlots) {
          toast.error(
            `Only ${remainingSlots} more image${
              remainingSlots === 1 ? "" : "s"
            } will be added to stay within the ${MAX_UPDATE_IMAGES}-image limit.`
          );
          filesToAdd = filesToAdd.slice(0, remainingSlots);
        }

        const newImagePromises = filesToAdd.map((file) => fileToDataURL(file));
        const newImages = await Promise.all(newImagePromises);
        setUpdateImages([...updateImages, ...newImages]);
        e.target.value = "";
      } catch (error) {
        toast.error("Error reading image files");
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
        accept="image/png,image/jpeg"
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
            ? `Limit reached (${MAX_UPDATE_IMAGES})`
            : "Add images"
        }
      >
        <LuPlus className="w-[18px] h-[18px]" />
      </button>
    </div>
  );
}

export default UpdateImageUpload;
