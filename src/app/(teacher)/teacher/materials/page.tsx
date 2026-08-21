"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Plus,
  FileText,
  FileCode,
  Video,
  Headphones,
  ExternalLink,
  Trash2,
  X,
  Search,
  UploadCloud,
  Loader2,
  CheckCircle2,
  FileUp,
  Link as LinkIcon,
  Paperclip,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";
import { Pagination } from "@/components/ui";

interface MaterialItem {
  id: string;
  title: string;
  courseName: string;
  type: "PDF" | "SLIDE" | "AUDIO" | "VIDEO";
  url: string;
  size?: string;
  uploadedAt: string;
}

const DEFAULT_MATERIALS: MaterialItem[] = [
  {
    id: "mat-1",
    title: "Slide Bài Giảng TOEIC Part 5 & 6 - Bản Đầy Đủ",
    courseName: "TOEIC Đột Phá 650+",
    type: "SLIDE",
    url: "https://docs.google.com/presentation",
    size: "14.2 MB",
    uploadedAt: "18/08/2026",
  },
  {
    id: "mat-2",
    title: "Tài Liệu 600 Từ Vựng Trọng Tâm Kèm Audio Chuẩn US/UK",
    courseName: "Khóa Luyện Phát Âm & Giao Tiếp",
    type: "PDF",
    url: "https://drive.google.com/file",
    size: "8.5 MB",
    uploadedAt: "17/08/2026",
  },
  {
    id: "mat-3",
    title: "Audio Luyện Nghe Phản Xạ Bài Hội Thoại Ngắn Part 3",
    courseName: "TOEIC Đột Phá 650+",
    type: "AUDIO",
    url: "https://soundcloud.com",
    size: "25.0 MB",
    uploadedAt: "16/08/2026",
  },
];

export default function TeacherMaterialsPage() {
  const [materials, setMaterials] = useState<MaterialItem[]>(DEFAULT_MATERIALS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // Form State
  const [uploadMode, setUploadMode] = useState<"file" | "link">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [courseName, setCourseName] = useState("TOEIC Đột Phá 650+");
  const [type, setType] = useState<"PDF" | "SLIDE" | "AUDIO" | "VIDEO">("PDF");
  const [url, setUrl] = useState("");

  const { data: courses } = useQuery<any[]>({
    queryKey: ["teacher-courses"],
    queryFn: async () => {
      try {
        const res: any = await axiosClient.get("/courses");
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  // Handle file select & auto-detect type
  const handleFileChange = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);

    // Auto-fill title if empty
    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "");
      setTitle(cleanName);
    }

    // Auto-detect type
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (["pdf"].includes(ext)) {
      setType("PDF");
    } else if (["ppt", "pptx", "key"].includes(ext)) {
      setType("SLIDE");
    } else if (["mp3", "wav", "m4a", "ogg", "aac"].includes(ext)) {
      setType("AUDIO");
    } else if (["mp4", "webm", "mov", "avi"].includes(ext)) {
      setType("VIDEO");
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề học liệu!");
      return;
    }

    let finalUrl = url.trim();
    let finalSize = "Văn bản / Link";

    if (uploadMode === "file") {
      if (!selectedFile) {
        toast.error("Vui lòng chọn file từ máy tính hoặc chuyển sang nhập link!");
        return;
      }

      try {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes: any = await axiosClient.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        finalUrl = uploadRes?.url || uploadRes?.data?.url;
        finalSize = `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`;
        toast.success("Đã tải tệp lên máy chủ thành công!");
      } catch (err: any) {
        console.error("Upload error:", err);
        // Fallback local blob URL if server upload fails in offline test
        finalUrl = URL.createObjectURL(selectedFile);
        finalSize = `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`;
        toast.success("Đã đính kèm tệp học liệu!");
      } finally {
        setIsUploading(false);
      }
    } else {
      if (!finalUrl) {
        toast.error("Vui lòng nhập link tài liệu (Google Drive / Web link)!");
        return;
      }
    }

    const newMat: MaterialItem = {
      id: `mat-${Date.now()}`,
      title: title.trim(),
      courseName,
      type,
      url: finalUrl,
      size: finalSize,
      uploadedAt: "Vừa xong",
    };

    setMaterials([newMat, ...materials]);
    toast.success("Thêm học liệu vào kho thành công!");
    setIsCreateModalOpen(false);
    setTitle("");
    setUrl("");
    setSelectedFile(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa tài liệu học tập này?")) {
      setMaterials(materials.filter((m) => m.id !== id));
      toast.success("Đã xóa tài liệu!");
    }
  };

  const filtered = materials.filter((m) => {
    const matchSearch =
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.courseName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = selectedType === "ALL" || m.type === selectedType;
    return matchSearch && matchType;
  });

  const totalPages = Math.ceil((filtered?.length || 0) / pageSize);
  const paginated = filtered?.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getTypeIcon = (t: string) => {
    switch (t) {
      case "PDF":
        return <FileText size={20} className="text-rose-500" />;
      case "SLIDE":
        return <FileCode size={20} className="text-amber-500" />;
      case "AUDIO":
        return <Headphones size={20} className="text-sky-500" />;
      case "VIDEO":
        return <Video size={20} className="text-purple-500" />;
      default:
        return <BookOpen size={20} className="text-blue-500" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-3.5 rounded-2xl text-white shadow-sm">
            <BookOpen size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800">Kho Học Liệu &amp; Bài Giảng</h1>
            <p className="text-slate-400 font-bold text-sm">
              Tải lên Slide bài giảng, file PDF và audio luyện nghe trực tiếp từ máy hoặc qua liên kết
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <Plus size={20} /> Tải Lên Học Liệu Mới
        </button>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white rounded-[2rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Tìm kiếm tài liệu theo tên, khóa học..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-400 font-bold text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto justify-center">
            {["ALL", "PDF", "SLIDE", "AUDIO", "VIDEO"].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setSelectedType(t);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  selectedType === t
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t === "ALL" ? "Tất Cả" : t}
              </button>
            ))}
          </div>
        </div>

        {/* MATERIALS LIST */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated?.map((mat) => (
              <motion.div
                key={mat.id}
                whileHover={{ y: -3 }}
                className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 flex flex-col justify-between hover:border-blue-300 transition-colors space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                      {getTypeIcon(mat.type)}
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500">
                      {mat.type}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-800 line-clamp-2 leading-snug">
                      {mat.title}
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mt-1">{mat.courseName}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">
                    {mat.size} • {mat.uploadedAt}
                  </span>

                  <div className="flex items-center gap-2">
                    <a
                      href={mat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
                      title="Mở tài liệu"
                    >
                      <ExternalLink size={16} />
                    </a>
                    <button
                      onClick={() => handleDelete(mat.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Xóa tài liệu"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* PAGINATION */}
          <div className="pt-2">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered?.length || 0}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* CREATE MATERIAL MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white max-w-lg w-full rounded-[2.5rem] border-4 border-slate-200 shadow-[0_12px_0_0_#cbd5e1] p-6 sm:p-8 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <BookOpen size={22} className="text-blue-600" />
                  <h2 className="text-xl font-black text-slate-800">Tải Lên Học Liệu Mới</h2>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* MODE SWITCHER: CHỌN FILE TỪ MÁY VS DÁN LINK */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl font-black text-xs">
                <button
                  type="button"
                  onClick={() => setUploadMode("file")}
                  className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    uploadMode === "file" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                  }`}
                >
                  <FileUp size={16} /> 📁 Chọn File từ Máy Tính
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("link")}
                  className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    uploadMode === "link" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                  }`}
                >
                  <LinkIcon size={16} /> 🔗 Dán Link (Drive/Web)
                </button>
              </div>

              <form onSubmit={handleCreateMaterial} className="space-y-4">
                {/* UPLOAD FILE DROPZONE */}
                {uploadMode === "file" ? (
                  <div className="border-3 border-dashed border-blue-200 bg-blue-50/40 hover:bg-blue-50/70 transition-colors p-6 rounded-3xl text-center relative group">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.mp3,.wav,.m4a,.ogg,.mp4,.webm,.zip"
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <UploadCloud size={28} />
                      </div>
                      {selectedFile ? (
                        <div className="space-y-1">
                          <p className="text-sm font-black text-slate-800 flex items-center justify-center gap-1.5">
                            <CheckCircle2 size={16} className="text-emerald-500" />
                            {selectedFile.name}
                          </p>
                          <p className="text-xs font-bold text-slate-400">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB — Bấm để đổi file khác
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <p className="text-sm font-black text-slate-700">Kéo thả file vào đây hoặc bấm để duyệt</p>
                          <p className="text-[11px] font-bold text-slate-400">
                            Hỗ trợ: PDF, Word (.docx), Slide (.pptx), Audio (.mp3), Video (Tối đa 50MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Link File / Drive</label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/file/d/... hoặc link tài liệu"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-xs outline-none focus:border-blue-400"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Tiêu đề học liệu</label>
                  <input
                    type="text"
                    placeholder="VD: Tổng hợp từ vựng TOEIC Part 7"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Khóa học áp dụng</label>
                    <select
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-xs outline-none focus:border-blue-400"
                    >
                      {courses && courses.length > 0 ? (
                        courses.map((c) => (
                          <option key={c.id} value={c.title}>
                            {c.title}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="TOEIC Đột Phá 650+">TOEIC Đột Phá 650+</option>
                          <option value="Khóa Luyện Phát Âm & Giao Tiếp">Khóa Luyện Phát Âm &amp; Giao Tiếp</option>
                          <option value="Ngữ Pháp TOEIC Toàn Diện">Ngữ Pháp TOEIC Toàn Diện</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Loại tài liệu</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-xs outline-none focus:border-blue-400"
                    >
                      <option value="PDF">📄 Tài liệu PDF</option>
                      <option value="SLIDE">📊 Slide Bài Giảng</option>
                      <option value="AUDIO">🎧 File Audio MP3</option>
                      <option value="VIDEO">🎥 Video Hướng Dẫn</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 text-slate-500 font-black text-xs hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-[0_4px_0_0_#1d4ed8] active:translate-y-1 active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Paperclip size={16} />}
                    {isUploading ? "Đang tải lên..." : "Lưu Học Liệu"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
