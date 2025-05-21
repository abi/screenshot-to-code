import { useState, useEffect } from "react";
import { HTTP_BACKEND_URL } from "../../config";
import { BsCheckLg } from "react-icons/bs";
import { Button } from "../ui/button";

interface InputFile {
  name: string;
  path: string;
}

interface InputFileSelectorProps {
  onFilesSelected: (files: string[]) => void;
}

function InputFileSelector({ onFilesSelected }: InputFileSelectorProps) {
  const [inputFiles, setInputFiles] = useState<InputFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchInputFiles();
  }, []);

  const fetchInputFiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${HTTP_BACKEND_URL}/eval_input_files`);
      if (!response.ok) {
        throw new Error("Failed to fetch input files");
      }
      
      const data = await response.json();
      setInputFiles(data);
      
      // By default, select all files
      const allFilePaths = data.map((file: InputFile) => file.path);
      setSelectedFiles(allFilePaths);
      onFilesSelected(allFilePaths);
    } catch (error) {
      console.error("Error fetching input files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileToggle = (filePath: string) => {
    setSelectedFiles((prev) => {
      const newSelection = prev.includes(filePath)
        ? prev.filter((path) => path !== filePath)
        : [...prev, filePath];
      
      onFilesSelected(newSelection);
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    const allFilePaths = inputFiles.map((file) => file.path);
    setSelectedFiles(allFilePaths);
    onFilesSelected(allFilePaths);
  };

  const handleClearAll = () => {
    setSelectedFiles([]);
    onFilesSelected([]);
  };

  if (isLoading) {
    return <div className="text-center">Loading input files...</div>;
  }

  return (
    <div className="w-full max-w-md">
      <div className="border rounded-md p-2 space-y-2 max-h-80 overflow-y-auto">
        {inputFiles.map((file) => (
          <div
            key={file.path}
            className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-50 ${
              selectedFiles.includes(file.path)
                ? "bg-blue-50 border border-blue-200"
                : ""
            }`}
            onClick={() => handleFileToggle(file.path)}
          >
            <span className="text-sm truncate" title={file.name}>
              {file.name}
            </span>
            {selectedFiles.includes(file.path) ? (
              <BsCheckLg className="h-4 w-4 text-blue-500" />
            ) : (
              <div className="h-4 w-4 border rounded-sm" />
            )}
          </div>
        ))}
      </div>
      
      <div className="flex justify-between mt-2">
        <p className="text-sm text-gray-500">
          Selected: {selectedFiles.length} file
          {selectedFiles.length !== 1 ? "s" : ""}
        </p>
        <div className="space-x-2">
          {selectedFiles.length < inputFiles.length && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Select all
            </Button>
          )}
          {selectedFiles.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default InputFileSelector;
