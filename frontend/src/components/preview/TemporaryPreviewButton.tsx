import { useEffect, useState } from "react";
import copy from "copy-to-clipboard";
import toast from "react-hot-toast";
import {
  LuCopy,
  LuExternalLink,
  LuLink,
  LuLoader2,
  LuRefreshCw,
  LuTrash2,
} from "react-icons/lu";
import {
  isStaleTempPreviewError,
  publishTempPreview,
  revokeTempPreview,
  type TempPreviewConnection,
} from "../../lib/tempPreview";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  loadTempPreview,
  removeTempPreview,
  saveTempPreview,
} from "./tempPreviewStorage";

interface Props {
  code: string;
  projectKey: string | null;
}

export function TemporaryPreviewButton({ code, projectKey }: Props) {
  const [connection, setConnection] = useState<TempPreviewConnection | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    setConnection(projectKey ? loadTempPreview(projectKey) : null);
  }, [projectKey]);

  const handlePublish = async () => {
    if (!projectKey || !code.trim()) return;
    setIsPublishing(true);
    try {
      let nextConnection: TempPreviewConnection;
      let updatedExistingPreview = Boolean(connection);
      try {
        nextConnection = await publishTempPreview({
          html: code,
          previous: connection,
        });
      } catch (error) {
        if (!connection || !isStaleTempPreviewError(error)) throw error;
        removeTempPreview(projectKey);
        nextConnection = await publishTempPreview({ html: code });
        updatedExistingPreview = false;
      }

      saveTempPreview(projectKey, nextConnection);
      setConnection(nextConnection);
      copy(nextConnection.canonicalUrl);
      toast.success(
        updatedExistingPreview
          ? "Temporary preview updated and link copied"
          : "Temporary preview published and link copied"
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to publish temporary preview"
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopy = () => {
    if (!connection) return;
    copy(connection.canonicalUrl);
    toast.success("Preview link copied");
  };

  const handleRemove = async () => {
    if (!projectKey || !connection) return;
    setIsRemoving(true);
    try {
      await revokeTempPreview(connection);
      removeTempPreview(projectKey);
      setConnection(null);
      toast.success("Temporary preview removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove temporary preview"
      );
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title="Publish Temporary Preview"
          className="h-9 w-9"
          data-testid="temporary-preview-trigger"
        >
          <LuLink />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
            Temporary preview
          </div>
          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-zinc-400">
            Publish the current HTML to temp.md for 7 days. Anyone with the link
            can view it. No account required.
          </p>
        </div>

        {connection ? (
          <>
            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              title="Copy preview link"
            >
              <span className="min-w-0 flex-1 truncate">{connection.canonicalUrl}</span>
              <LuCopy className="shrink-0" />
            </button>
            <div className="text-[11px] text-gray-500 dark:text-zinc-500">
              Expires {formatExpiry(connection.expiresAt)}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handlePublish}
                disabled={isPublishing || isRemoving}
                className="flex-1 gap-1.5"
                data-testid="publish-temp-preview"
              >
                {isPublishing ? (
                  <LuLoader2 className="animate-spin" />
                ) : (
                  <LuRefreshCw />
                )}
                Update
              </Button>
              <Button type="button" size="sm" variant="outline" asChild>
                <a
                  href={connection.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-1.5"
                >
                  <LuExternalLink />
                  Open
                </a>
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={handleRemove}
                disabled={isPublishing || isRemoving}
                title="Remove temporary preview"
                className="h-8 w-8 text-gray-500 hover:text-red-600"
              >
                {isRemoving ? (
                  <LuLoader2 className="animate-spin" />
                ) : (
                  <LuTrash2 />
                )}
              </Button>
            </div>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={handlePublish}
            disabled={isPublishing || !projectKey}
            className="w-full gap-1.5"
            data-testid="publish-temp-preview"
          >
            {isPublishing && <LuLoader2 className="animate-spin" />}
            Publish preview
          </Button>
        )}

        <a
          href="https://temp.md"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-[11px] text-gray-400 hover:text-gray-600 dark:text-zinc-600 dark:hover:text-zinc-400"
        >
          Temporary hosting by temp.md
        </a>
      </PopoverContent>
    </Popover>
  );
}

function formatExpiry(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "in 7 days";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
