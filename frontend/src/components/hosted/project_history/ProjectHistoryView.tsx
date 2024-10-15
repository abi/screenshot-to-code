import { useEffect, useState } from "react";
import { formatRelative } from "date-fns";
import { SAAS_BACKEND_URL } from "../../../config";
import { useAuthenticatedFetch } from "../useAuthenticatedFetch";
import { Button } from "../../ui/button";
import { STACK_DESCRIPTIONS, Stack } from "../../../lib/stacks";
import React from "react";
import Spinner from "../../core/Spinner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationLink,
} from "../../ui/pagination";
import { useStore } from "../../../store/store";
import { Dialog, DialogContent } from "../../ui/dialog";

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

interface PaginationSectionProps {
  currentPage: number;
  totalPages: number;
  handlePageChange: (page: number) => void;
}

function PaginationSection({
  currentPage,
  totalPages,
  handlePageChange,
}: PaginationSectionProps) {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => handlePageChange(currentPage - 1)}
          />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            onClick={() => handlePageChange(1)}
            isActive={currentPage === 1}
          >
            1
          </PaginationLink>
        </PaginationItem>
        {currentPage > 1 && currentPage < totalPages && (
          <PaginationItem>
            <PaginationLink isActive>{currentPage}</PaginationLink>
          </PaginationItem>
        )}
        {totalPages > 1 && (
          <PaginationItem>
            <PaginationLink
              onClick={() => handlePageChange(totalPages)}
              isActive={currentPage === totalPages}
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        )}
        <PaginationItem>
          <PaginationNext onClick={() => handlePageChange(currentPage + 1)} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function ProjectHistoryView({ importFromCode }: ProjectHistoryViewProps) {
  const authenticatedFetch = useAuthenticatedFetch();
  const [isLoading, setIsLoading] = useState(false);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isProjectsHistoryDialogOpen = useStore(
    (state) => state.isProjectsHistoryDialogOpen
  );
  const setProjectsHistoryDialogOpen = useStore(
    (state) => state.setProjectsHistoryDialogOpen
  );

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const res: ProjectHistoryResponse = await authenticatedFetch(
          `${SAAS_BACKEND_URL}/generations/view?page=${currentPage}`
        );

        // Ensure each generation has a stack, defaulting to HTML_TAILWIND if not present
        const processedGenerations = res.generations.map((generation) => ({
          ...generation,
          stack: generation.stack || Stack.HTML_TAILWIND,
        }));
        setGenerations(processedGenerations);
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
    setProjectsHistoryDialogOpen(false);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <Dialog
      open={isProjectsHistoryDialogOpen}
      onOpenChange={(isOpen: boolean) => setProjectsHistoryDialogOpen(isOpen)}
    >
      <DialogContent className="max-h-[90%] overflow-y-auto">
        <div className="text-sm text-gray-500 mb-2">
          Total Generations: {totalCount}
        </div>

        <PaginationSection
          currentPage={currentPage}
          totalPages={totalPages}
          handlePageChange={handlePageChange}
        />

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

        <PaginationSection
          currentPage={currentPage}
          totalPages={totalPages}
          handlePageChange={handlePageChange}
        />
      </DialogContent>
    </Dialog>
  );
}

export default ProjectHistoryView;
