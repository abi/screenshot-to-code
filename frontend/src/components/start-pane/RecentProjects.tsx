import { useEffect, useRef, useState } from "react";
import { formatRelative } from "date-fns";
import * as Sentry from "@sentry/react";
import { SAAS_BACKEND_URL } from "../../config";
import { useAuthenticatedFetch } from "../hosted/useAuthenticatedFetch";
import { Stack } from "../../lib/stacks";
import StackLabel from "../core/StackLabel";
import { LuArrowRight } from "react-icons/lu";

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

const PREVIEW_WIDTH = 1366;
const PREVIEW_HEIGHT = 900;
const MAX_RECENT = 3;

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return formatRelative(date.toLocaleString(), new Date());
  } catch (error) {
    Sentry.captureException(error);
    return "unknown";
  }
};

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
          srcDoc={srcDoc}
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
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res: ProjectHistoryResponse = await authenticatedFetch(
          `${SAAS_BACKEND_URL}/generations/view?page=1`
        );
        const processed = res.generations.slice(0, MAX_RECENT).map((g) => ({
          ...g,
          stack: g.stack || Stack.HTML_TAILWIND,
          date_created: formatDate(g.date_created),
        }));
        setGenerations(processed);
      } catch (error) {
        Sentry.captureException(error);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  if (!isLoaded || generations.length === 0) return null;

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
        {generations.map((generation, index) => (
          <button
            key={index}
            onClick={() => importFromCode(generation.completion, generation.stack)}
            className="group text-left overflow-hidden rounded-lg border border-gray-200 bg-white transition-all hover:shadow-md hover:border-gray-300 dark:border-zinc-700 dark:bg-zinc-800/60 dark:hover:border-zinc-600"
          >
            <SmallPreview
              srcDoc={generation.completion}
              title={`Recent project ${index + 1}`}
            />
            <div className="px-3 py-2">
              <div className="text-xs font-medium text-gray-700 dark:text-zinc-300">
                <StackLabel stack={generation.stack} />
              </div>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
                {generation.date_created}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default RecentProjects;
