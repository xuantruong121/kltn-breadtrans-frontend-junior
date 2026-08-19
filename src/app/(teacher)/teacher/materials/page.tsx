"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
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
  DownloadCloud,
  CheckCircle2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "@/lib/api/axiosClient";
import { Button3D } from "@/components/ui";
import toast from "react-hot-toast";

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

  // Form State
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

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) {
      toast.error("Vui lòng điền đầy đủ tiêu đề và link tài liệu!");
      return;
    }

    const newMat: MaterialItem = {
      id: `mat-${Date.now()}`,
      title: title.trim(),
      courseName,
      type,
      url: url.trim(),
      size: "Văn bản / Link",
      uploadedAt: "Vừa xong",
    };

    setMaterials([newMat, ...materials]);
    toast.success("Tải lên học liệu thành công!");
    setIsCreateModalOpen(false);
    setTitle("");
    setUrl("");
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
              Đăng tải Slide bài giảng, file PDF và audio luyện nghe cho học viên
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-400 font-bold text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto justify-center">
            {["ALL", "PDF", "SLIDE", "AUDIO"].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((mat) => (
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
      </div>

      {/* CREATE MATERIAL MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-[2.5rem] border-4 border-slate-200 shadow-[0_12px_0_0_#cbd5e1] p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-800">Tải Lên Tài Liệu Mới</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateMaterial} className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Tiêu đề tài liệu</label>
                <input
                  type="text"
                  placeholder="VD: Tổng hợp từ vựng TOEIC Part 7"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 font-bold text-sm outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Khóa học áp dụng</label>
                <select
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Loại tài liệu</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none"
                  >
                    <option value="PDF">Tài liệu PDF</option>
                    <option value="SLIDE">Slide Bài Giảng</option>
                    <option value="AUDIO">File Audio MP3</option>
                    <option value="VIDEO">Video Hướng Dẫn</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase mb-1 block">Link File / Drive</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 font-bold text-xs outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-500 font-bold text-sm"
                >
                  Hủy
                </button>
                <Button3D type="submit" variant="blue" size="md">
                  Lưu Tài Liệu
                </Button3D>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
