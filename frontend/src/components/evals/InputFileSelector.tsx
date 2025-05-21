import { useState, useEffect } from "react";
import { HTTP_BACKEND_URL } from "../../config";
import { BsCheckLg, BsChevronDown, BsChevronRight } from "react-icons/bs";
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
  const [isExpanded, setIsExpanded] = useState(false);
  
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

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (isLoading) {
    return <div className="text-center text-sm text-gray-500">Loading input files...</div>;
  }

  const fileCount = inputFiles.length;
  const selectedCount = selectedFiles.length;

  return (
    <div className="w-full">
      <div 
        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-md p-2 mb-2 border" 
        onClick={toggleExpanded}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <BsChevronDown className="text-gray-500" /> : <BsChevronRight className="text-gray-500" />}
          <div>
            <span className="text-sm font-medium">Input Files</span>
            <span className="ml-2 text-xs text-gray-500">
              {selectedCount} of {fileCount} selected
            </span>
          </div>
        </div>
        
        <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="text-xs h-6 px-2 text-gray-500 hover:text-gray-700"
            disabled={selectedCount === fileCount}
          >
            All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-xs h-6 px-2 text-gray-500 hover:text-gray-700"
            disabled={selectedCount === 0}
          >
            None
          </Button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="border rounded-md overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            <div className="grid grid-cols-1 divide-y divide-gray-100">
              {inputFiles.map((file) => (
                <div
                  key={file.path}
                  className={`flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-gray-50 ${
                    selectedFiles.includes(file.path)
                      ? "bg-blue-50"
                      : ""
                  }`}
                  onClick={() => handleFileToggle(file.path)}
                >
                  <span className="text-xs truncate pr-2" title={file.name}>
                    {file.name}
                  </span>
                  {selectedFiles.includes(file.path) ? (
                    <BsCheckLg className="h-3 w-3 text-blue-500 flex-shrink-0" />
                  ) : (
                    <div className="h-3 w-3 border rounded-sm flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InputFileSelector;
