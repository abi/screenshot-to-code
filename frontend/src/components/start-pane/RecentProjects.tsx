import { useEffect, useRef, useState } from "react";
import { formatRelative } from "date-fns";
import * as Sentry from "@sentry/react";
import { SAAS_BACKEND_URL } from "../../config";
import { useAuthenticatedFetch } from "../hosted/useAuthenticatedFetch";
import {
  ProjectHistoryGeneration,
  ProjectHistoryProject,
  ProjectHistoryResponse,
} from "../hosted/types";
import { Stack } from "../../lib/stacks";
import { normalizeBabelCdn } from "../../lib/babelCdn";
import StackLabel from "../core/StackLabel";
import { LuArrowRight } from "react-icons/lu";

interface Generation extends Omit<ProjectHistoryGeneration, "stack"> {
  stack: Stack;
}

interface Project extends Omit<ProjectHistoryProject, "generations"> {
  generations: Generation[];
}

const PREVIEW_WIDTH = 1366;
const PREVIEW_HEIGHT = 900;
const MAX_RECENT = 3;

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new RangeError(`Invalid time value: ${dateString}`);
    }
    return formatRelative(date, new Date());
  } catch (error) {
    Sentry.captureException(error);
    return "unknown";
  }
};

function groupGenerationsIntoProjects(
  generations: ProjectHistoryGeneration[],
): ProjectHistoryProject[] {
  const projectsById = new Map<string, ProjectHistoryProject>();

  generations.forEach((generation) => {
    const projectKey = generation.generation_group_id ?? generation.id;
    const existingProject = projectsById.get(projectKey);
    if (existingProject) {
      existingProject.generations.push(generation);
      return;
    }

    projectsById.set(projectKey, {
      id: projectKey,
      generation_group_id: generation.generation_group_id,
      date_created: generation.date_created,
      generations: [generation],
    });
  });

  return Array.from(projectsById.values());
}

function SmallPreview({ srcDoc, title }: { srcDoc: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setScale(entry.contentRect.width / PREVIEW_WIDTH);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-gray-50 dark:bg-zinc-900"
      style={{ aspectRatio: `${PREVIEW_WIDTH} / ${PREVIEW_HEIGHT}` }}
    >
      {scale > 0 && (
        <iframe
          srcDoc={normalizeBabelCdn(srcDoc)}
          title={title}
          sandbox="allow-scripts"
          className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
          style={{
            width: PREVIEW_WIDTH,
            height: PREVIEW_HEIGHT,
            transform: `scale(${scale})`,
          }}
        />
      )}
    </div>
  );
}

interface RecentProjectsProps {
  importFromCode: (code: string, stack: Stack) => void;
  onOpenProjects: () => void;
}

function RecentProjects({ importFromCode, onOpenProjects }: RecentProjectsProps) {
  const authenticatedFetch = useAuthenticatedFetch();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedVariantByProjectId, setSelectedVariantByProjectId] = useState<
    Record<string, string>
  >({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res: ProjectHistoryResponse | undefined = await authenticatedFetch(
          `${SAAS_BACKEND_URL}/generations/view?page=1`,
        );
        if (!res) return;

        const processed = (res.projects ?? groupGenerationsIntoProjects(res.generations))
          .slice(0, MAX_RECENT)
          .map((project) => ({
            ...project,
            date_created: formatDate(project.date_created),
            generations: project.generations.map((generation) => ({
              ...generation,
              stack: generation.stack || Stack.HTML_TAILWIND,
              date_created: formatDate(generation.date_created),
            })),
          }));
        setProjects(processed);
      } catch (error) {
        Sentry.captureException(error);
      } finally {
        setIsLoaded(true);
      }
    };
    void load();
  }, [authenticatedFetch]);

  if (!isLoaded || projects.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-500 dark:text-zinc-400">
          Recent projects
        </h3>
        <button
          onClick={onOpenProjects}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        >
          View all
          <LuArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {projects.map((project, index) => {
          const selectedVariantId = selectedVariantByProjectId[project.id];
          const selectedGeneration =
            project.generations.find(
              (generation) => generation.id === selectedVariantId,
            ) ?? project.generations[0];
          if (!selectedGeneration) return null;

          return (
            <div
              key={project.id}
              role="button"
              tabIndex={0}
              onClick={() =>
                importFromCode(selectedGeneration.completion, selectedGeneration.stack)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  importFromCode(
                    selectedGeneration.completion,
                    selectedGeneration.stack,
                  );
                }
              }}
              className="group cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white text-left transition-all hover:border-gray-300 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-800/60 dark:hover:border-zinc-600"
            >
              <SmallPreview
                srcDoc={selectedGeneration.completion}
                title={`Recent project ${index + 1}`}
              />
              <div className="px-3 py-2">
                <div className="text-xs font-medium text-gray-700 dark:text-zinc-300">
                  <StackLabel stack={selectedGeneration.stack} />
                </div>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
                  {selectedGeneration.date_created}
                </p>
              </div>
              <div className="flex items-center gap-1.5 border-t border-gray-100 px-3 py-2 dark:border-zinc-700">
                <span className="mr-1 text-[11px] font-medium uppercase text-gray-400 dark:text-zinc-500">
                  {project.generations.length} variant
                  {project.generations.length !== 1 ? "s" : ""}
                </span>
                {project.generations.map((generation, variantIndex) => {
                  const isActive = generation.id === selectedGeneration.id;

                  return (
                    <button
                      key={generation.id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedVariantByProjectId((previousSelections) => ({
                          ...previousSelections,
                          [project.id]: generation.id,
                        }));
                      }}
                      className={`h-6 min-w-6 rounded-md px-2 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-blue-600 text-white dark:bg-blue-500"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                      }`}
                      aria-label={`Use variant ${variantIndex + 1}`}
                    >
                      {variantIndex + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RecentProjects;
