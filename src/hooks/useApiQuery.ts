import { useQuery, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/utils/apiError";

export function useApiQuery<TData = any, TError = any>(
  queryKey: unknown[],
  url: string,
  options?: Omit<UseQueryOptions<TData, TError, TData, any>, "queryKey" | "queryFn">
): UseQueryResult<TData, TError> {
  return useQuery<TData, TError>({
    queryKey,
    queryFn: async () => {
      try {
        const response = await axiosClient.get(url);
        // axiosClient usually returns response.data directly if configured with interceptors,
        // so we check if response.data exists or just return response
        return (response as any).data !== undefined ? (response as any).data : response;
      } catch (error: any) {
        // Centralized error handling
        const message = getApiErrorMessage(error, "Không tải được dữ liệu. Vui lòng thử lại.");
        if (error.response?.status !== 401 && error.response?.status !== 404) {
          toast.error(message);
        }
        throw error;
      }
    },
    ...options,
  });
}
