import { useCallback, useEffect, useRef, useState } from "react";
import { formatRelative } from "date-fns";
import * as Sentry from "@sentry/react";
import toast from "react-hot-toast";
import { SAAS_BACKEND_URL } from "../../../config";
import { useAuthenticatedFetch } from "../useAuthenticatedFetch";
import {
  DeleteGenerationsResponse,
  ProjectHistoryGeneration,
  ProjectHistoryResponse,
} from "../types";
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
import { LuFolderOpen, LuTrash2, LuX } from "react-icons/lu";
import { Button } from "../../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";

const PREVIEW_DESKTOP_WIDTH = 1366;
const PREVIEW_DESKTOP_HEIGHT = 900;
const PAGE_SIZE = 24;

interface Generation extends Omit<ProjectHistoryGeneration, "stack"> {
  stack: Stack;
}

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new RangeError(`Invalid time value: ${dateString}`);
    }
    return formatRelative(date, new Date());
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
  className?: string;
}

function PaginationSection({
  currentPage,
  totalPages,
  handlePageChange,
  className = "my-3",
}: PaginationSectionProps) {
  if (totalPages <= 1) return null;

  return (
    <Pagination className={className}>
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

function PreviewIframe({ srcDoc, title }: { srcDoc: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setScale(entry.contentRect.width / PREVIEW_DESKTOP_WIDTH);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden border-b border-gray-100 bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900"
      style={{
        aspectRatio: `${PREVIEW_DESKTOP_WIDTH} / ${PREVIEW_DESKTOP_HEIGHT}`,
      }}
    >
      {scale > 0 && (
        <iframe
          srcDoc={srcDoc}
          title={title}
          sandbox="allow-scripts"
          className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
          style={{
            width: PREVIEW_DESKTOP_WIDTH,
            height: PREVIEW_DESKTOP_HEIGHT,
            transform: `scale(${scale})`,
          }}
        />
      )}
    </div>
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
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedGenerationIds, setSelectedGenerationIds] = useState<string[]>(
    [],
  );
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(
    async (page: number) => {
      setIsLoading(true);
      try {
        const res: ProjectHistoryResponse | undefined = await authenticatedFetch(
          `${SAAS_BACKEND_URL}/generations/view?page=${page}`,
        );
        if (!res) return;

        const processedGenerations = res.generations.map((generation) => ({
          ...generation,
          stack: generation.stack || Stack.HTML_TAILWIND,
          date_created: formatDate(generation.date_created),
        }));
        if (page > 1 && processedGenerations.length === 0) {
          setCurrentPage(page - 1);
          return;
        }

        setGenerations(processedGenerations);
        Sentry.setContext("Local Variables", { processedGenerations });
        setTotalPages(res.total_pages);
        setTotalCount(res.total_count);
        setIsSelectionMode(false);
        setSelectedGenerationIds([]);
      } catch (error) {
        Sentry.captureException(error);
        console.error("Failed to load project history:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [authenticatedFetch],
  );

  useEffect(() => {
    addEvent("ViewProjectHistory");
  }, []);

  useEffect(() => {
    void loadData(currentPage);
  }, [currentPage, loadData]);

  const onLoadGeneration = (completion: string, stack: Stack) => {
    importFromCode(completion, stack);
    addEvent("ProjectHistory:LoadInEditor");
  };

  const toggleSelection = (generationId: string) => {
    if (!isSelectionMode) return;
    setSelectedGenerationIds((previousIds) =>
      previousIds.includes(generationId)
        ? previousIds.filter((id) => id !== generationId)
        : [...previousIds, generationId],
    );
  };

  const openDeleteDialog = (generationIds: string[]) => {
    if (generationIds.length === 0) return;
    setPendingDeleteIds(generationIds);
    setIsDeleteDialogOpen(true);
  };

  const onDeleteDialogOpenChange = (open: boolean) => {
    if (isDeleting) return;
    setIsDeleteDialogOpen(open);
    if (!open) {
      setPendingDeleteIds([]);
    }
  };

  const deleteGeneration = async () => {
    if (pendingDeleteIds.length === 0) return;

    setIsDeleting(true);
    try {
      const response: DeleteGenerationsResponse | undefined =
        await authenticatedFetch(
          `${SAAS_BACKEND_URL}/generations/delete`,
          "POST",
          { generation_ids: pendingDeleteIds },
        );
      if (!response) return;

      const deletedIds = new Set(response.deleted_ids);
      const remainingGenerations = generations.filter(
        (generation) => !deletedIds.has(generation.id),
      );
      const nextTotalCount = Math.max(0, totalCount - response.deleted_count);
      const nextTotalPages = Math.ceil(nextTotalCount / PAGE_SIZE);

      setGenerations(remainingGenerations);
      setTotalCount(nextTotalCount);
      setTotalPages(nextTotalPages);
      setSelectedGenerationIds((previousIds) =>
        previousIds.filter((id) => !deletedIds.has(id)),
      );
      setIsSelectionMode(false);
      setIsDeleteDialogOpen(false);
      setPendingDeleteIds([]);
      toast.success(
        response.deleted_count === 1 ? "Deleted project" : "Deleted projects",
      );

      if (remainingGenerations.length === 0 && currentPage > 1) {
        setIsLoading(true);
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      Sentry.captureException(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete projects",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const onPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setIsSelectionMode(false);
      setSelectedGenerationIds([]);
      setCurrentPage(newPage);
    }
  };

  const selectedCount = selectedGenerationIds.length;
  const isBulkDelete = pendingDeleteIds.length > 1;

  return (
    <>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={onDeleteDialogOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isBulkDelete ? "Delete selected projects?" : "Delete project?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isBulkDelete
                ? "Projects cannot be recovered once deleted. Are you sure you want to delete them?"
                : "This project cannot be recovered once deleted. Are you sure you want to delete it?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void deleteGeneration();
              }}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 lg:px-6 lg:py-6">
          {/* Header */}
          <div className="mb-5">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Projects
            </h1>
            {totalCount > 0 && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
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
              <div className="relative mb-3 flex items-center justify-center">
                <div className="absolute left-0">
                  {!isSelectionMode ? (
                    <button
                      className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
                      onClick={() => setIsSelectionMode(true)}
                    >
                      Select
                    </button>
                  ) : (
                    <button
                      className="rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
                      onClick={() => {
                        setIsSelectionMode(false);
                        setSelectedGenerationIds([]);
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <PaginationSection
                  currentPage={currentPage}
                  totalPages={totalPages}
                  handlePageChange={onPageChange}
                  className=""
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {generations.map((generation, index) => {
                  const isSelected = selectedGenerationIds.includes(
                    generation.id,
                  );
                  return (
                    <div
                      key={generation.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (isSelectionMode) {
                          toggleSelection(generation.id);
                        } else {
                          onLoadGeneration(
                            generation.completion,
                            generation.stack,
                          );
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          if (isSelectionMode) {
                            toggleSelection(generation.id);
                          } else {
                            onLoadGeneration(
                              generation.completion,
                              generation.stack,
                            );
                          }
                        }
                      }}
                      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md dark:bg-zinc-800/60 ${
                        isSelected
                          ? "border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-400 dark:ring-blue-400/20"
                          : "border-gray-200 hover:border-gray-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                      }`}
                    >
                      {/* Selection checkbox overlay */}
                      {isSelectionMode && (
                        <div className="absolute left-2.5 top-2.5 z-10">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                              isSelected
                                ? "border-blue-500 bg-blue-500 text-white dark:border-blue-400 dark:bg-blue-400"
                                : "border-white/80 bg-white/60 backdrop-blur-sm dark:border-zinc-300/80 dark:bg-zinc-800/60"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="h-3 w-3"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                      )}

                      <PreviewIframe
                        srcDoc={generation.completion}
                        title={`Generation ${index + 1}`}
                      />

                      {/* Footer */}
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-800 dark:text-zinc-200">
                            <StackLabel stack={generation.stack} />
                          </div>
                          <p className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
                            {generation.date_created}
                          </p>
                        </div>
                        {!isSelectionMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteDialog([generation.id]);
                            }}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-zinc-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                            title="Delete"
                          >
                            <LuTrash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
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

      {/* Floating action bar for selection mode */}
      {isSelectionMode && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-full border border-gray-300 bg-white px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.18)] dark:border-zinc-500 dark:bg-zinc-800 dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <span className="text-sm font-medium text-gray-700 dark:text-zinc-200">
              {selectedCount === 0
                ? "Click projects to select"
                : `${selectedCount} selected`}
            </span>
            <div className="h-4 w-px bg-gray-200 dark:bg-zinc-700" />
            <button
              className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              onClick={() =>
                setSelectedGenerationIds(
                  selectedCount === generations.length
                    ? []
                    : generations.map((g) => g.id),
                )
              }
            >
              {selectedCount === generations.length
                ? "Deselect all"
                : "Select all"}
            </button>
            <div className="h-4 w-px bg-gray-200 dark:bg-zinc-700" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
              disabled={isDeleting || selectedCount === 0}
              onClick={() => openDeleteDialog(selectedGenerationIds)}
            >
              <LuTrash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
            <button
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedGenerationIds([]);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
            >
              <LuX className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ProjectHistoryView;
