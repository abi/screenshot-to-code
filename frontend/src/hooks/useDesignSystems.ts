import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  defaultDesignSystemsClient,
  DesignSystemsClient,
  DesignSystemPayload,
} from "../lib/design-systems";
import { DesignSystem } from "../types";

export function useDesignSystems(
  client: DesignSystemsClient = defaultDesignSystemsClient
) {
  const [designSystems, setDesignSystems] = useState<DesignSystem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshDesignSystems = useCallback(async () => {
    try {
      setIsLoading(true);
      setDesignSystems(await client.fetchDesignSystems());
    } catch (error) {
      console.error("Failed to load design systems", error);
      toast.error("Could not load design systems from the backend.");
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    refreshDesignSystems();
  }, [refreshDesignSystems]);

  const create = useCallback(
    async (payload: DesignSystemPayload) => {
      const created = await client.createDesignSystem(payload);
      setDesignSystems((current) => [...current, created]);
      return created;
    },
    [client]
  );

  const update = useCallback(
    async (id: string, payload: Partial<DesignSystemPayload>) => {
      const updated = await client.updateDesignSystem(id, payload);
      setDesignSystems((current) =>
        current.map((designSystem) =>
          designSystem.id === updated.id ? updated : designSystem
        )
      );
      return updated;
    },
    [client]
  );

  const remove = useCallback(
    async (id: string) => {
      await client.deleteDesignSystem(id);
      setDesignSystems((current) =>
        current.filter((designSystem) => designSystem.id !== id)
      );
    },
    [client]
  );

  return {
    designSystems,
    isLoading,
    createDesignSystem: create,
    updateDesignSystem: update,
    deleteDesignSystem: remove,
    refreshDesignSystems,
  };
}
