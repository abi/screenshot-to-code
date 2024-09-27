import { useEffect, useState } from "react";
import { formatRelative } from "date-fns";
import { SAAS_BACKEND_URL } from "../../../config";
import { useAuthenticatedFetch } from "../useAuthenticatedFetch";
import { Button } from "../../ui/button";
import { STACK_DESCRIPTIONS, Stack } from "../../../lib/stacks";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible";
import React from "react";
import Spinner from "../../core/Spinner";

interface Generation {
  date_created: string;
  completion: string;
  stack: Stack;
}

interface ProjectHistoryResponse {
  generations: Generation[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface ProjectHistoryViewProps {
  importFromCode: (code: string, stack: Stack) => void;
}

function generateDisplayComponent(stack: Stack) {
  const stackComponents = STACK_DESCRIPTIONS[stack].components;

  return (
    <div>
      {stackComponents.map((component, index) => (
        <React.Fragment key={index}>
          <span className="font-semibold">{component}</span>
          {index < stackComponents.length - 1 && " + "}
        </React.Fragment>
      ))}
    </div>
  );
}

function ProjectHistoryView({ importFromCode }: ProjectHistoryViewProps) {
  const authenticatedFetch = useAuthenticatedFetch();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const res: ProjectHistoryResponse = await authenticatedFetch(
          `${SAAS_BACKEND_URL}/generations/view?page=${currentPage}`
        );
        setGenerations(res.generations);
        setTotalPages(res.total_pages);
        setTotalCount(res.total_count);
      } catch (error) {
        console.error("Failed to load project history:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [currentPage]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return formatRelative(date.toLocaleString(), new Date());
  };

  const handleLoadGeneration = (completion: string, stack: Stack) => {
    importFromCode(completion, stack);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    <Collapsible>
      <CollapsibleTrigger>Project History</CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex justify-between items-center mb-4">
          <Button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
          >
            Previous
          </Button>
          <span>
            Page {currentPage} of {totalPages} (Total generations: {totalCount})
          </span>
          <Button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
          >
            Next
          </Button>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Spinner />
          </div>
        ) : (
          <ul>
            {generations.map((gen, index) => (
              <li key={index} className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <p>Created {formatDate(gen.date_created)}</p>
                  {generateDisplayComponent(gen.stack)}
                </div>
                <iframe
                  srcDoc={gen.completion}
                  title={`Generation ${index}`}
                  width="100%"
                  height="300"
                  sandbox="allow-scripts"
                  className="mb-2"
                />
                <Button
                  onClick={() =>
                    handleLoadGeneration(gen.completion, gen.stack)
                  }
                >
                  Load in Editor
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default ProjectHistoryView;
