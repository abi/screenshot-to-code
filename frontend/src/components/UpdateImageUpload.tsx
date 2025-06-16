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
  updateImage: string | null;
  setUpdateImage: (image: string | null) => void;
}

function UpdateImageUpload({ updateImage, setUpdateImage }: Props) {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      fileToDataURL(file)
        .then((dataUrl) => {
          setUpdateImage(dataUrl);
        })
        .catch((error) => {
          toast.error("Error reading image file");
          console.error("Error reading file:", error);
        });
    }
  }, [setUpdateImage]);

  const { getRootProps, getInputProps, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpeg", ".jpg"],
    },
    maxFiles: 1,
    maxSize: 1024 * 1024 * 20, // 20MB
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropRejected: (rejectedFiles) => {
      setIsDragActive(false);
      toast.error(rejectedFiles[0].errors[0].message);
    },
  });

  const removeImage = () => {
    setUpdateImage(null);
    setIsDragActive(false);
  };

  if (updateImage) {
    return (
      <div className="relative mb-2">
        <img
          src={updateImage}
          alt="Update reference"
          className="w-full max-w-[300px] border border-gray-200 rounded-md"
        />
        <Button
          variant="destructive"
          size="sm"
          className="absolute top-1 right-1 h-6 w-6 p-0"
          onClick={removeImage}
        >
          <Cross2Icon className="h-3 w-3" />
        </Button>
        <div className="text-gray-400 uppercase text-xs text-center mt-1">
          Reference Image
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
        Add reference image (optional)
      </p>
      <p className="text-xs text-gray-400 mt-1">
        PNG, JPG up to 20MB
      </p>
    </div>
  );
}

export default UpdateImageUpload;
