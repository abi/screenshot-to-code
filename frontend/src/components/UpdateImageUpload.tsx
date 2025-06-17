import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-hot-toast";
import { Cross2Icon, UploadIcon } from "@radix-ui/react-icons";
import { Button } from "./ui/button";

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

function UpdateImageUpload({ updateImages, setUpdateImages }: Props) {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      try {
        const newImagePromises = acceptedFiles.map(file => fileToDataURL(file));
        const newImages = await Promise.all(newImagePromises);
        setUpdateImages([...updateImages, ...newImages]);
      } catch (error) {
        toast.error("Error reading image files");
        console.error("Error reading files:", error);
      }
    }
  }, [updateImages, setUpdateImages]);

  const { getRootProps, getInputProps, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpeg", ".jpg"],
    },
    multiple: true,
    maxSize: 1024 * 1024 * 20, // 20MB
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropRejected: (rejectedFiles) => {
      setIsDragActive(false);
      const errorMessages = rejectedFiles.map(file => file.errors[0].message).join(", ");
      toast.error(errorMessages);
    },
  });

  const removeImage = (index: number) => {
    const newImages = updateImages.filter((_, i) => i !== index);
    setUpdateImages(newImages);
    setIsDragActive(false);
  };

  const clearAllImages = () => {
    setUpdateImages([]);
    setIsDragActive(false);
  };

  if (updateImages.length > 0) {
    return (
      <div className="mb-2">
        <div className="flex justify-between items-center mb-2">
          <div className="text-gray-400 uppercase text-xs">
            Reference Images ({updateImages.length})
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllImages}
            className="h-6 text-xs px-2"
          >
            Clear All
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {updateImages.map((image, index) => (
            <div key={index} className="relative">
              <img
                src={image}
                alt={`Update reference ${index + 1}`}
                className="w-full h-24 object-cover border border-gray-200 rounded-md"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-1 right-1 h-5 w-5 p-0"
                onClick={() => removeImage(index)}
              >
                <Cross2Icon className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors mb-2
        ${isDragAccept ? "border-green-400 bg-green-50" : ""}
        ${isDragReject ? "border-red-400 bg-red-50" : ""}
        ${isDragActive ? "border-blue-400 bg-blue-50" : "border-gray-300"}
        hover:border-gray-400 hover:bg-gray-50
      `}
    >
      <input {...getInputProps()} />
      <UploadIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
      <p className="text-sm text-gray-600">
        Add reference images (optional)
      </p>
      <p className="text-xs text-gray-400 mt-1">
        PNG, JPG up to 20MB each • Multiple files supported
      </p>
    </div>
  );
}

export default UpdateImageUpload;
