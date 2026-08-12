import { useMutation, UseMutationOptions, UseMutationResult } from "@tanstack/react-query";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";

type HttpMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export function useApiMutation<TData = any, TVariables = any, TError = any>(
  url: string,
  method: HttpMethod = "POST",
  options?: Omit<UseMutationOptions<TData, TError, TVariables, any>, "mutationFn">
): UseMutationResult<TData, TError, TVariables> {
  return useMutation<TData, TError, TVariables>({
    mutationFn: async (variables: TVariables) => {
      try {
        let response;
        if (method === "DELETE") {
          // DELETE usually takes data in config.data if needed, but for typical REST it's just the URL.
          // Since we might pass an ID in URL instead of variables, we check if url contains :id
          const finalUrl = url.includes(":id") && variables ? url.replace(":id", String((variables as any).id || variables)) : url;
          response = await axiosClient.delete(finalUrl, { data: variables });
        } else {
          // POST, PUT, PATCH
          const finalUrl = url.includes(":id") && variables ? url.replace(":id", String((variables as any).id)) : url;
          response = await axiosClient.request({
            url: finalUrl,
            method,
            data: variables,
          });
        }
        return (response as any).data !== undefined ? (response as any).data : response;
      } catch (error: any) {
        // Centralized error handling
        const message = error.response?.data?.message || error.message || "Đã xảy ra lỗi khi thực hiện thao tác";
        toast.error(`Thất bại: ${message}`);
        throw error;
      }
    },
    ...options,
  });
}
