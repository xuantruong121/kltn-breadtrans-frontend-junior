"use client";

import { useState } from "react";
import { ImagePlus, Loader2, Search } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";

const PROVIDER_LABEL: Record<string, string> = {
  PEXELS: "Pexels",
  PIXABAY: "Pixabay",
  OPENVERSE: "Openverse",
  WIKIMEDIA_COMMONS: "Wikimedia Commons",
};

type MediaSearchReason =
  | "SUCCESS"
  | "SEARCH_NO_RESULT"
  | "SEARCH_PROVIDER_UNAVAILABLE"
  | "VISION_REJECTED_ALL"
  | "VISION_UNAVAILABLE";

type MediaGenerationReason =
  | "SUCCESS"
  | "AI_IMAGE_GENERATION_NOT_CONFIGURED"
  | "AI_IMAGE_GENERATION_FAILED"
  | "VISION_REJECTED_ALL"
  | "VISION_UNAVAILABLE";

/** Exact Admin-facing copy per reason — the UI must never say "no suitable
 * image" when the real cause was a provider/Vision outage. */
const SEARCH_REASON_COPY: Record<Exclude<MediaSearchReason, "SUCCESS">, string> = {
  SEARCH_NO_RESULT:
    "Không tìm được ảnh phù hợp với nội dung này. Bạn có thể thử từ khóa khác hoặc tải ảnh lên.",
  SEARCH_PROVIDER_UNAVAILABLE:
    "Nguồn ảnh đang tạm thời không khả dụng. Bạn vẫn có thể tải ảnh lên thủ công.",
  VISION_UNAVAILABLE:
    "Đã tìm thấy ảnh nhưng dịch vụ kiểm tra AI đang tạm thời bận. Hãy thử lại sau hoặc tải ảnh lên thủ công.",
  VISION_REJECTED_ALL:
    "Các ảnh tìm được chưa phù hợp với nội dung bài học. Bạn có thể tìm lại hoặc tải ảnh riêng.",
};

const GENERATION_REASON_COPY: Record<
  Exclude<MediaGenerationReason, "SUCCESS">,
  string
> = {
  AI_IMAGE_GENERATION_NOT_CONFIGURED: "Dịch vụ tạo ảnh AI chưa được cấu hình.",
  AI_IMAGE_GENERATION_FAILED: "Không thể tạo ảnh lúc này.",
  VISION_REJECTED_ALL:
    "Ảnh do AI tạo chưa phù hợp với nội dung bài học. Bạn có thể thử sinh ảnh khác.",
  VISION_UNAVAILABLE:
    "Đã tạo ảnh nhưng dịch vụ kiểm tra AI đang tạm thời bận. Bạn có thể tự xem trước và quyết định.",
};

type MediaCandidate = {
  provider: string;
  previewUrl: string;
  [key: string]: unknown;
};

type SearchResponse = {
  candidate: MediaCandidate | null;
  vision: { status: "PASS" | "FAIL" | "LOW_CONFIDENCE" | "UNAVAILABLE" } | null;
  brief: string;
  reason: MediaSearchReason;
};

type GeneratedCandidate = { token: string; previewUrl: string };

type GenerationResponse = {
  candidate: GeneratedCandidate | null;
  vision: { status: "PASS" | "FAIL" | "LOW_CONFIDENCE" | "UNAVAILABLE" } | null;
  reason: MediaGenerationReason;
};

/** Free-first "find suitable image" flow shared by Course cover and Lesson
 * media authoring, plus an entirely separate "Sinh ảnh bằng AI" (Cloudflare
 * Workers AI / FLUX.1-schnell) generation action — these are two distinct
 * authoring actions with different provenance (existing/open media vs
 * synthetic media), never blurred or auto-chained into one another. Both are
 * candidate-first: the backend's explicit `reason` field (not a flattened
 * message string) tells us exactly why no usable candidate was returned, so
 * the UI never reports "no results" when the real cause was a provider or
 * Vision outage. Accept is only ever offered for a successful (or, for
 * generation, Vision-unavailable-but-reviewable) candidate. */
export default function MediaSearchPanel({
  searchUrl,
  acceptUrl,
  generateUrl,
  generateAcceptUrl,
  onAccepted,
  onUploadInstead,
}: {
  searchUrl: string;
  acceptUrl: string;
  /** Omit to hide the "Sinh ảnh bằng AI" action entirely. */
  generateUrl?: string;
  generateAcceptUrl?: string;
  onAccepted: (result: any) => void;
  /** Called when the Admin picks "Tải ảnh lên" from a non-success state,
   * e.g. to scroll to or focus the page's own manual upload control. */
  onUploadInstead?: () => void;
}) {
  const [loading, setLoading] = useState<
    "search" | "accept" | "generate" | "generate-accept" | null
  >(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [generated, setGenerated] = useState<GenerationResponse | null>(null);

  const search = async () => {
    setGenerated(null);
    setLoading("search");
    try {
      const response: any = await axiosClient.post(searchUrl, {});
      const data: SearchResponse = response?.data || response;
      setResult(data);
      if (data.reason !== "SUCCESS") {
        toast.error(SEARCH_REASON_COPY[data.reason]);
      }
    } catch (e) {
      toast.error(
        getApiErrorMessage(e, SEARCH_REASON_COPY.SEARCH_PROVIDER_UNAVAILABLE),
      );
      setResult(null);
    } finally {
      setLoading(null);
    }
  };

  const accept = async () => {
    if (!result?.candidate) return;
    setLoading("accept");
    try {
      const response: any = await axiosClient.post(acceptUrl, {
        brief: result.brief,
        candidate: result.candidate,
      });
      const data = response?.data || response;
      onAccepted(data);
      setResult(null);
      toast.success("Đã dùng ảnh này cho bản nháp.");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không thể lưu ảnh này. Vui lòng thử lại."));
    } finally {
      setLoading(null);
    }
  };

  const uploadInstead = () => {
    setResult(null);
    setGenerated(null);
    onUploadInstead?.();
  };

  const generate = async () => {
    if (!generateUrl) return;
    setResult(null);
    setLoading("generate");
    try {
      const response: any = await axiosClient.post(generateUrl, {});
      const data: GenerationResponse = response?.data || response;
      setGenerated(data);
      if (data.reason !== "SUCCESS" && data.reason !== "VISION_UNAVAILABLE") {
        toast.error(GENERATION_REASON_COPY[data.reason]);
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e, GENERATION_REASON_COPY.AI_IMAGE_GENERATION_FAILED));
      setGenerated(null);
    } finally {
      setLoading(null);
    }
  };

  const acceptGenerated = async () => {
    if (!generated?.candidate || !generateAcceptUrl) return;
    setLoading("generate-accept");
    try {
      const response: any = await axiosClient.post(generateAcceptUrl, {
        token: generated.candidate.token,
        brief: "ai-generated",
      });
      const data = response?.data || response;
      onAccepted(data);
      setGenerated(null);
      toast.success("Đã dùng ảnh do AI tạo cho bản nháp.");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Không thể lưu ảnh này. Vui lòng thử lại."));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void search()}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading === "search" ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Search size={13} />
          )}
          {loading === "search" ? "Đang tìm ảnh phù hợp..." : "Tìm ảnh phù hợp"}
        </button>
        {generateUrl && (
          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading === "generate" ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <ImagePlus size={13} />
            )}
            {loading === "generate" ? "Đang tạo ảnh..." : "Sinh ảnh bằng AI"}
          </button>
        )}
      </div>

      {result && result.reason !== "SUCCESS" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-xs font-medium text-amber-800">
            {SEARCH_REASON_COPY[result.reason]}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void search()}
              disabled={loading !== null}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Thử lại
            </button>
            <button
              type="button"
              onClick={uploadInstead}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Tải ảnh lên
            </button>
          </div>
        </div>
      )}

      {result?.candidate && result.reason === "SUCCESS" && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-700">Ảnh được đề xuất</p>
          <img
            src={result.candidate.previewUrl}
            alt="Ảnh đề xuất"
            className="h-32 w-full rounded-md border border-slate-200 object-cover sm:w-56"
          />
          <p className="text-xs text-slate-500">
            Nguồn: {PROVIDER_LABEL[result.candidate.provider] || result.candidate.provider}
            {" · "}
            {result.vision?.status === "PASS" && "Đánh giá phù hợp: đạt"}
            {result.vision?.status === "LOW_CONFIDENCE" &&
              "Đánh giá phù hợp: cần bạn xem kỹ trước khi dùng"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void accept()}
              disabled={loading !== null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading === "accept" && <Loader2 size={13} className="animate-spin" />}
              Dùng ảnh này
            </button>
            <button
              type="button"
              onClick={() => void search()}
              disabled={loading !== null}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Tìm ảnh khác
            </button>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {generated && generated.reason !== "SUCCESS" && generated.reason !== "VISION_UNAVAILABLE" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-xs font-medium text-amber-800">
            {GENERATION_REASON_COPY[generated.reason]}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void generate()}
              disabled={loading !== null}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Sinh ảnh khác
            </button>
            <button
              type="button"
              onClick={uploadInstead}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Tải ảnh lên
            </button>
          </div>
        </div>
      )}

      {generated?.candidate &&
        (generated.reason === "SUCCESS" || generated.reason === "VISION_UNAVAILABLE") && (
          <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3 space-y-2">
            <p className="text-xs font-semibold text-teal-800">Ảnh do AI tạo</p>
            <img
              src={generated.candidate.previewUrl}
              alt="Ảnh do AI tạo"
              className="h-32 w-full rounded-md border border-slate-200 object-cover sm:w-56"
            />
            {generated.reason === "VISION_UNAVAILABLE" && (
              <p className="text-xs text-amber-700">
                {GENERATION_REASON_COPY.VISION_UNAVAILABLE}
              </p>
            )}
            {generated.vision?.status === "LOW_CONFIDENCE" && (
              <p className="text-xs text-slate-500">
                Đánh giá phù hợp: cần bạn xem kỹ trước khi dùng
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void acceptGenerated()}
                disabled={loading !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {loading === "generate-accept" && (
                  <Loader2 size={13} className="animate-spin" />
                )}
                Dùng ảnh này
              </button>
              <button
                type="button"
                onClick={() => void generate()}
                disabled={loading !== null}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Sinh ảnh khác
              </button>
              <button
                type="button"
                onClick={() => setGenerated(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
              >
                Hủy
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
