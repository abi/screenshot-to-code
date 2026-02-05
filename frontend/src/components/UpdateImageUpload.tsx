import { useRef } from "react";
import { toast } from "react-hot-toast";
import { Cross2Icon, ImageIcon } from "@radix-ui/react-icons";
import { Button } from "./ui/button";

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

  const remaining = Math.max(0, MAX_UPDATE_IMAGES - updateImages.length);
  const isAtLimit = remaining === 0;

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span>{`Reference images: ${updateImages.length}/${MAX_UPDATE_IMAGES}`}</span>
        <span>{isAtLimit ? "Limit reached" : `${remaining} remaining`}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto py-2">
        {updateImages.map((image, index) => (
          <div key={index} className="relative flex-shrink-0 group">
            <img
              src={image}
              alt={`Reference ${index + 1}`}
              className="h-12 w-12 object-cover rounded border border-gray-200 dark:border-gray-600"
            />
            <button
              onClick={() => removeImage(index)}
              className="absolute -top-1 -right-1 h-4 w-4 bg-gray-800 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Cross2Icon className="h-2 w-2" />
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
      
      {/* Image button styled to match other buttons */}
      <Button
        type="button"
        variant="outline"
        size="default"
        onClick={handleButtonClick}
        className={`dark:text-white dark:bg-gray-700 h-10 px-3 ${
          updateImages.length > 0 ? "border-blue-500" : ""
        } relative`}
        disabled={isAtLimit}
        title={
          isAtLimit
            ? `Limit reached (${MAX_UPDATE_IMAGES})`
            : updateImages.length > 0
              ? `Add up to ${remaining} more`
              : `Add up to ${MAX_UPDATE_IMAGES}`
        }
      >
        <ImageIcon className="h-4 w-4" />
        {updateImages.length > 0 && (
          <span className="ml-2 text-sm">{`${updateImages.length}/${MAX_UPDATE_IMAGES}`}</span>
        )}
      </Button>
      
    </div>
  );
}

export default UpdateImageUpload;
