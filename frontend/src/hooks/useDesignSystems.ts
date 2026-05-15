import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  createDesignSystem,
  deleteDesignSystem,
  DesignSystemPayload,
  fetchDesignSystems,
  updateDesignSystem,
} from "../lib/design-systems";
import { DesignSystem } from "../types";

export function useDesignSystems() {
  const [designSystems, setDesignSystems] = useState<DesignSystem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshDesignSystems = useCallback(async () => {
    try {
      setIsLoading(true);
      setDesignSystems(await fetchDesignSystems());
    } catch (error) {
      console.error("Failed to load design systems", error);
      toast.error("Could not load design systems from the backend.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDesignSystems();
  }, [refreshDesignSystems]);

  const create = useCallback(async (payload: DesignSystemPayload) => {
    const created = await createDesignSystem(payload);
    setDesignSystems((current) => [...current, created]);
    return created;
  }, []);

  const update = useCallback(
    async (id: string, payload: Partial<DesignSystemPayload>) => {
      const updated = await updateDesignSystem(id, payload);
      setDesignSystems((current) =>
        current.map((designSystem) =>
          designSystem.id === updated.id ? updated : designSystem
        )
      );
      return updated;
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await deleteDesignSystem(id);
    setDesignSystems((current) =>
      current.filter((designSystem) => designSystem.id !== id)
    );
  }, []);

  return {
    designSystems,
    isLoading,
    createDesignSystem: create,
    updateDesignSystem: update,
    deleteDesignSystem: remove,
    refreshDesignSystems,
  };
}
