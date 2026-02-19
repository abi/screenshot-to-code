import { useEffect, useState } from "react";
import { formatRelative } from "date-fns";
import * as Sentry from "@sentry/react";
import { SAAS_BACKEND_URL } from "../../../config";
import { useAuthenticatedFetch } from "../useAuthenticatedFetch";
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
import StackLabel from "../../core/StackLabel";
import { addEvent } from "../../../lib/analytics";
import { LuArrowRight, LuFolderOpen } from "react-icons/lu";

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

const PREVIEW_DESKTOP_WIDTH = 1366;
const PREVIEW_DESKTOP_HEIGHT = 900;

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
  if (totalPages <= 1) return null;

  return (
    <Pagination className="my-4">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => handlePageChange(currentPage - 1)}
            className={
              currentPage <= 1
                ? "pointer-events-none opacity-40"
                : "cursor-pointer"
            }
          />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink
            onClick={() => handlePageChange(1)}
            isActive={currentPage === 1}
            className="cursor-pointer"
          >
            1
          </PaginationLink>
        </PaginationItem>
        {currentPage > 1 && currentPage < totalPages && (
          <PaginationItem>
            <PaginationLink isActive className="cursor-pointer">
              {currentPage}
            </PaginationLink>
          </PaginationItem>
        )}
        {totalPages > 1 && (
          <PaginationItem>
            <PaginationLink
              onClick={() => handlePageChange(totalPages)}
              isActive={currentPage === totalPages}
              className="cursor-pointer"
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        )}
        <PaginationItem>
          <PaginationNext
            onClick={() => handlePageChange(currentPage + 1)}
            className={
              currentPage >= totalPages
                ? "pointer-events-none opacity-40"
                : "cursor-pointer"
            }
          />
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
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10 lg:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Projects
          </h1>
          {totalCount > 0 && (
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
              {totalCount} generation{totalCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : generations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-20 dark:border-zinc-700 dark:bg-zinc-800/30">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-700">
              <LuFolderOpen className="h-6 w-6 text-gray-400 dark:text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-zinc-200">
              No projects yet
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
              Your generated projects will appear here.
            </p>
          </div>
        ) : (
          <>
            <PaginationSection
              currentPage={currentPage}
              totalPages={totalPages}
              handlePageChange={onPageChange}
            />

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {generations.map((generation, index) => (
                <div
                  key={index}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-gray-300 dark:border-zinc-700 dark:bg-zinc-800/60 dark:hover:border-zinc-600"
                >
                  {/* Preview */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-gray-100 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900">
                    <iframe
                      srcDoc={generation.completion}
                      title={`Generation ${index}`}
                      width={PREVIEW_DESKTOP_WIDTH}
                      height={PREVIEW_DESKTOP_HEIGHT}
                      sandbox="allow-scripts"
                      className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
                      style={{
                        transform: `scale(${1 / (PREVIEW_DESKTOP_WIDTH / 600)})`,
                        width: PREVIEW_DESKTOP_WIDTH,
                        height: PREVIEW_DESKTOP_HEIGHT,
                      }}
                    />
                  </div>

                  {/* Info + button */}
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800 dark:text-zinc-200">
                        <StackLabel stack={generation.stack} />
                      </div>
                      <p className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
                        {generation.date_created}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        onLoadGeneration(generation.completion, generation.stack)
                      }
                      className="shrink-0 flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                    >
                      Open
                      <LuArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <PaginationSection
              currentPage={currentPage}
              totalPages={totalPages}
              handlePageChange={onPageChange}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default ProjectHistoryView;
