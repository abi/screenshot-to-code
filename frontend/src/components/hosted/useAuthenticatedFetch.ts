import { useAuth } from "@clerk/clerk-react";

type FetchMethod = "GET" | "POST" | "PUT" | "DELETE";

// Assumes that the backend is using JWTs for authentication
// and assumes JSON responses
// *If response code is not 200 OK or if there's any other error, throws an error
export const useAuthenticatedFetch = () => {
  const { getToken } = useAuth();

  const authenticatedFetch = async (
    url: string,
    method: FetchMethod = "GET",
    body: object | null | undefined = null
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
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    return json;
  };

  return authenticatedFetch;
};
