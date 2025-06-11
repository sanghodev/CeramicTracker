import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getApiBaseUrl } from "./environment";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let text: string;
    try {
      text = await res.text();
    } catch (e) {
      text = res.statusText;
    }
    throw new Error(`${res.status}: ${text || res.statusText}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Use relative URLs - Vite dev server handles proxying automatically
  const apiUrl = url.startsWith('/') ? url : `/${url}`;
  
  console.log(`API Request: ${method} ${apiUrl}`);
  
  const res = await fetch(apiUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log(`API Response: ${res.status} ${res.statusText}`);
  
  // Clone response before checking status to avoid body stream issues
  const resClone = res.clone();
  
  await throwIfResNotOk(resClone);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const apiUrl = url.startsWith('/') ? url : `/${url}`;
    
    const res = await fetch(apiUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    if (!res.ok) {
      let errorText = 'Unknown error';
      try {
        errorText = await res.text();
      } catch (e) {
        errorText = res.statusText;
      }
      throw new Error(`${res.status}: ${errorText}`);
    }

    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0, // Fresh data for deployment
      gcTime: 5 * 60 * 1000, // 5 minutes memory retention
      retry: 3, // Retry failed requests 3 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 2,
      retryDelay: 1000,
    },
  },
});
