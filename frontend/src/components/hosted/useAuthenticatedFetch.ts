import { useAuth } from "@clerk/clerk-react";
import { useCallback } from "react";
import { getApiErrorMessage } from "./apiErrors";

type FetchMethod = "GET" | "POST" | "PUT" | "DELETE";

// Assumes that the backend is using JWTs for authentication
// and assumes JSON responses
// *If response code is not 200 OK or if there's any other error, throws an error
export const useAuthenticatedFetch = () => {
  const { getToken } = useAuth();

  const authenticatedFetch = useCallback(
    async (
      url: string,
      method: FetchMethod = "GET",
      body: object | null | undefined = null,
    ) => {
      const accessToken = await getToken();
      if (!accessToken) return;

      const headers: HeadersInit = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      };

      const options: RequestInit = {
        method,
        headers,
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response));
      }

      const json = await response.json();
      return json;
    },
    [getToken],
  );

  return authenticatedFetch;
};
