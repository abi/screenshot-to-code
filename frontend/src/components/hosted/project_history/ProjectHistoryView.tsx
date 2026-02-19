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
    Sentry.setContext("Local Variables", { date });
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

  const [isLoading, setIsLoading] = useState(false);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
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
        Sentry.setContext("Local Variables", { processedGenerations });
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
  }, [currentPage]);

  const onLoadGeneration = (completion: string, stack: Stack) => {
    importFromCode(completion, stack);
    addEvent("ProjectHistory:LoadInEditor");
  };

  const onPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto sidebar-scrollbar-stable px-5 pb-6">
      <div className="mt-4">
        <div className="mb-4 px-1">
          <h2 className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Projects
          </h2>
        </div>
        <div className="mb-4 text-sm">Total Generations: {totalCount}</div>

        <PaginationSection
          currentPage={currentPage}
          totalPages={totalPages}
          handlePageChange={onPageChange}
        />

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner />
          </div>
        ) : generations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 px-6 py-12 text-center text-sm text-gray-500 dark:border-zinc-700 dark:text-zinc-400">
            No projects yet.
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {generations.map((generation, index) => (
              <Card key={index} className="overflow-hidden border shadow-sm">
                <CardHeader className="space-y-1 pb-2 text-sm">
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Created {generation.date_created}
                  </p>
                  <StackLabel stack={generation.stack} />
                </CardHeader>
                <CardContent className="pb-3">
                  <iframe
                    srcDoc={generation.completion}
                    title={`Generation ${index}`}
                    width="100%"
                    height="220px"
                    sandbox="allow-scripts"
                    className="rounded-md border"
                  />
                </CardContent>
                <CardFooter className="pt-0 text-sm">
                  <Button
                    className="w-full"
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
      </div>
    </div>
  );
}

export default ProjectHistoryView;
