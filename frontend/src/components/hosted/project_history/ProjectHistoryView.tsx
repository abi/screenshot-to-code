import { useEffect, useState } from "react";
import { formatRelative } from "date-fns";
import * as Sentry from "@sentry/react";
import { SAAS_BACKEND_URL } from "../../../config";
import { useAuthenticatedFetch } from "../useAuthenticatedFetch";
import { Button } from "../../ui/button";
import { Stack } from "../../../lib/stacks";
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
import { Card, CardContent, CardFooter, CardHeader } from "../../ui/card";
import StackLabel from "../../core/StackLabel";
import { addEvent } from "../../../lib/analytics";

//  Types for server responses
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

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return formatRelative(date.toLocaleString(), new Date());
  } catch (error) {
    Sentry.captureException(error);
    console.error("Failed to format date:", error);
    return "unknown";
  }
};

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

interface ProjectHistoryViewProps {
  importFromCode: (code: string, stack: Stack) => void;
}

function ProjectHistoryView({ importFromCode }: ProjectHistoryViewProps) {
  const authenticatedFetch = useAuthenticatedFetch();

  const isProjectsHistoryDialogOpen = useStore(
    (state) => state.isProjectsHistoryDialogOpen
  );
  const setProjectsHistoryDialogOpen = useStore(
    (state) => state.setProjectsHistoryDialogOpen
  );

  const [isLoading, setIsLoading] = useState(false);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isProjectsHistoryDialogOpen) return;

    const loadData = async () => {
      setIsLoading(true);
      addEvent("ViewProjectHistory");
      try {
        const res: ProjectHistoryResponse = await authenticatedFetch(
          `${SAAS_BACKEND_URL}/generations/view?page=${currentPage}`
        );

        // Ensure each generation has a stack, defaulting to HTML_TAILWIND if not present
        const processedGenerations = res.generations.map((generation) => ({
          ...generation,
          stack: generation.stack || Stack.HTML_TAILWIND,
          date_created: formatDate(generation.date_created),
        }));
        setGenerations(processedGenerations);
        setTotalPages(res.total_pages);
        setTotalCount(res.total_count);
      } catch (error) {
        Sentry.captureException(error);
        console.error("Failed to load project history:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [currentPage, isProjectsHistoryDialogOpen]);

  const onLoadGeneration = (completion: string, stack: Stack) => {
    importFromCode(completion, stack);
    setProjectsHistoryDialogOpen(false);
  };

  const onPageChange = (newPage: number) => {
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
        <h2 className="text-xl font-semibold">Project History</h2>
        <div className="text-sm mb-2">Total Generations: {totalCount}</div>

        <PaginationSection
          currentPage={currentPage}
          totalPages={totalPages}
          handlePageChange={onPageChange}
        />

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Spinner />
          </div>
        ) : (
          <ul>
            {generations.map((generation, index) => (
              <Card key={index} className="mb-4 pb-2 border-b-4">
                <CardHeader className="text-sm">
                  <p>Created {generation.date_created}</p>
                  <StackLabel stack={generation.stack} />
                </CardHeader>
                <CardContent>
                  <iframe
                    srcDoc={generation.completion}
                    title={`Generation ${index}`}
                    width="100%"
                    height="300"
                    sandbox="allow-scripts"
                    className="mb-2 border"
                  />
                </CardContent>
                <CardFooter className="text-sm">
                  <Button
                    onClick={() =>
                      onLoadGeneration(generation.completion, generation.stack)
                    }
                  >
                    Load in Editor
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </ul>
        )}

        <PaginationSection
          currentPage={currentPage}
          totalPages={totalPages}
          handlePageChange={onPageChange}
        />
      </DialogContent>
    </Dialog>
  );
}

export default ProjectHistoryView;
