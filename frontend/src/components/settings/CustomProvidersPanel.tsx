import { useState, useCallback } from "react";
import { nanoid } from "nanoid";
import { HTTP_BACKEND_URL } from "../../config";
import { CustomProvider, FetchedModel } from "../../lib/custom-providers";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../ui/select";

// ---- Icons (inline SVG to avoid extra deps) ----------------------------

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

// ---- Status dot --------------------------------------------------------

function StatusDot({ status }: { status: "ok" | "error" | "unknown" }) {
  const colors: Record<string, string> = {
    ok: "bg-green-500",
    error: "bg-red-500",
    unknown: "bg-gray-400",
  };
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${colors[status]}`}
    />
  );
}

// ---- Add / Edit modal --------------------------------------------------

interface ModalProps {
  initial: Partial<CustomProvider>;
  onSave: (provider: Omit<CustomProvider, "id"> & { id?: string }) => void;
  onClose: () => void;
}

const PLACEHOLDER_URLS = [
  "http://localhost:11434/v1  (Ollama)",
  "http://localhost:1234/v1   (LM Studio)",
  "https://api.groq.com/openai/v1",
  "https://openrouter.ai/api/v1",
];

function ProviderModal({ initial, onSave, onClose }: ModalProps) {
  const [name, setName] = useState(initial.name ?? "");
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl ?? "");
  const [apiKey, setApiKey] = useState(initial.apiKey ?? "");
  const [modelId, setModelId] = useState(initial.modelId ?? "");
  const [models, setModels] = useState<FetchedModel[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchedOnce, setFetchedOnce] = useState(!!initial.modelId);

  const handleFetch = useCallback(async () => {
    if (!baseUrl.trim()) return;
    setFetching(true);
    setFetchError(null);
    try {
      const url = new URL(`${HTTP_BACKEND_URL}/api/custom-providers/models`);
      url.searchParams.set("base_url", baseUrl.trim());
      if (apiKey.trim()) url.searchParams.set("api_key", apiKey.trim());

      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok || data.error) {
        setFetchError(data.error ?? "Unknown error fetching models.");
        setModels([]);
      } else {
        setModels(data.models as FetchedModel[]);
        setFetchedOnce(true);
        if (data.models.length > 0 && !modelId) {
          setModelId(data.models[0].id);
        }
      }
    } catch {
      setFetchError("Could not reach the backend. Make sure it is running.");
      setModels([]);
    } finally {
      setFetching(false);
    }
  }, [baseUrl, apiKey, modelId]);

  const canSave = name.trim() && baseUrl.trim() && modelId.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
          {initial.id ? "Edit Provider" : "Add Custom Provider"}
        </h3>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-zinc-300">
              Name
            </label>
            <Input
              placeholder="e.g. Local Ollama"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Base URL */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-zinc-300">
              Base URL
            </label>
            <Input
              placeholder={PLACEHOLDER_URLS[0]}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
              Must be an OpenAI-compatible endpoint (e.g. Ollama, LM Studio, Groq).
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-zinc-300">
              API Key{" "}
              <span className="font-normal text-gray-400 dark:text-zinc-500">
                (optional for local servers)
              </span>
            </label>
            <Input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          {/* Fetch models */}
          <div>
            <button
              type="button"
              disabled={!baseUrl.trim() || fetching}
              onClick={handleFetch}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              {fetching ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Fetching…
                </>
              ) : (
                "Fetch Models"
              )}
            </button>

            {fetchError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{fetchError}</p>
            )}
          </div>

          {/* Model selector — shown after fetch or when editing */}
          {(fetchedOnce || models.length > 0) && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-zinc-300">
                Model
              </label>
              {models.length > 0 ? (
                <Select value={modelId} onValueChange={setModelId}>
                  <SelectTrigger className="w-full text-left">
                    {modelId || "Select a model…"}
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                // Editing existing provider but haven't re-fetched yet
                <Input
                  placeholder="e.g. llama3.2"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                />
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSave}
            onClick={() => {
              onSave({
                id: initial.id,
                name: name.trim(),
                baseUrl: baseUrl.trim(),
                apiKey: apiKey.trim(),
                modelId: modelId.trim(),
                enabled: initial.enabled ?? true,
              });
              onClose();
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Main panel --------------------------------------------------------

interface Props {
  providers: CustomProvider[];
  onChange: (providers: CustomProvider[]) => void;
}

export function CustomProvidersPanel({ providers, onChange }: Props) {
  const [modalState, setModalState] = useState<{
    open: boolean;
    editing: Partial<CustomProvider>;
  }>({ open: false, editing: {} });

  const openAdd = () => setModalState({ open: true, editing: {} });
  const openEdit = (p: CustomProvider) => setModalState({ open: true, editing: p });
  const closeModal = () => setModalState({ open: false, editing: {} });

  const handleSave = (
    saved: Omit<CustomProvider, "id"> & { id?: string }
  ) => {
    if (saved.id) {
      // Update existing
      onChange(providers.map((p) => (p.id === saved.id ? { ...p, ...saved, id: p.id } : p)));
    } else {
      // Add new
      onChange([...providers, { ...saved, id: nanoid() }]);
    }
  };

  const handleDelete = (id: string) => {
    onChange(providers.filter((p) => p.id !== id));
  };

  const handleToggle = (id: string, enabled: boolean) => {
    onChange(providers.map((p) => (p.id === id ? { ...p, enabled } : p)));
  };

  return (
    <>
      {/* Panel */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/60">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-zinc-700">
          <div>
            <h2 className="text-sm font-medium text-gray-900 dark:text-white">
              Custom Providers
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
              Connect any OpenAI-compatible endpoint (Ollama, LM Studio, Groq, etc.)
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
          >
            <PlusIcon />
            Add
          </button>
        </div>

        {providers.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-gray-400 dark:text-zinc-500">
            No custom providers yet. Click <strong>Add</strong> to connect one.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-zinc-700">
            {providers.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <StatusDot status={p.modelId ? "ok" : "unknown"} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {p.name}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-zinc-400">
                    {p.modelId} · {p.baseUrl}
                  </p>
                </div>

                {/* Toggle */}
                <Switch
                  checked={p.enabled}
                  onCheckedChange={(v) => handleToggle(p.id, v)}
                  aria-label={`Toggle ${p.name}`}
                />

                {/* Edit */}
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="rounded p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                  aria-label={`Edit ${p.name}`}
                >
                  <EditIcon />
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="rounded p-1 text-gray-500 transition hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  aria-label={`Delete ${p.name}`}
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}

        {providers.filter((p) => p.enabled).length > 2 && (
          <p className="border-t border-yellow-100 bg-yellow-50 px-4 py-2 text-xs text-yellow-700 dark:border-yellow-900/30 dark:bg-yellow-900/10 dark:text-yellow-400">
            ⚠ Only the first 2 enabled providers are used per generation.
          </p>
        )}
      </div>

      {/* Modal */}
      {modalState.open && (
        <ProviderModal
          initial={modalState.editing}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </>
  );
}
