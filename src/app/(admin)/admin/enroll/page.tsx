"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Loader2,
  UserPlus,
  Users,
  X,
  BookOpen,
  Check,
  ChevronsUpDown,
  GraduationCap,
  UserMinus,
  CheckSquare,
  Square,
  AlertCircle,
  Layers,
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";

type Student = {
  id: number;
  email: string;
  profile: {
    fullName: string;
    avatar: string | null;
    phone?: string | null;
  } | null;
};

type ClassOption = {
  id: number;
  name: string;
  course: { id: number; title: string; thumbnail?: string };
  studentCount?: number;
  activeEnrollmentCount?: number;
  totalEnrollmentCount?: number;
  capacity?: number;
};

type EnrolledStudent = {
  userId: number;
  progress: number;
  status: string;
  joinedAt: string;
  user: {
    id: number;
    email: string;
    profile: {
      fullName: string;
      avatar: string | null;
      phone: string | null;
    } | null;
  };
};

export default function AdminEnrollPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const defaultClassId = searchParams.get("classId") || "";

  const [selectedClassId, setSelectedClassId] = useState<string>(defaultClassId);
  const [prevDefaultId, setPrevDefaultId] = useState<string>(defaultClassId);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [classSearchQuery, setClassSearchQuery] = useState("");
  const [searchCandidate, setSearchCandidate] = useState("");
  const [searchEnrolled, setSearchEnrolled] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentToRemove, setStudentToRemove] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const comboboxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync state if defaultClassId query changes from external navigation
  if (defaultClassId !== prevDefaultId) {
    setPrevDefaultId(defaultClassId);
    setSelectedClassId(defaultClassId);
  }

  const handleOpenCombobox = () => {
    setClassSearchQuery("");
    setIsComboboxOpen(true);
  };

  const handleCloseCombobox = () => {
    setClassSearchQuery("");
    setIsComboboxOpen(false);
  };

  // Click outside to close combobox
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        comboboxRef.current &&
        !comboboxRef.current.contains(event.target as Node)
      ) {
        setIsComboboxOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-focus search input when combobox opens
  useEffect(() => {
    if (isComboboxOpen) {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isComboboxOpen]);

  const { data: classes, isLoading: isLoadingClasses } = useQuery<ClassOption[]>({
    queryKey: ["admin-classes"],
    queryFn: async () =>
      axiosClient.get("/admin/classes") as unknown as ClassOption[],
  });

  const { data: students, isLoading: isLoadingStudents } = useQuery<Student[]>({
    queryKey: ["admin-users", "STUDENT"],
    queryFn: async () =>
      axiosClient.get("/admin/users?role=STUDENT") as unknown as Student[],
  });

  const { data: classDetail, isLoading: isLoadingEnrolled } = useQuery<{
    enrollments: EnrolledStudent[];
    _count: { enrollments: number };
    name: string;
    course: { id: number; title: string; thumbnail?: string };
    capacity?: number;
  }>({
    queryKey: ["admin-class-detail", selectedClassId],
    queryFn: async () =>
      axiosClient.get(`/admin/classes/${selectedClassId}`) as unknown as {
        enrollments: EnrolledStudent[];
        _count: { enrollments: number };
        name: string;
        course: { id: number; title: string; thumbnail?: string };
        capacity?: number;
      },
    enabled: !!selectedClassId,
  });

  // Selected Class Object
  const currentSelectedClass = useMemo(() => {
    if (!classes || !selectedClassId) return null;
    return classes.find((c) => c.id.toString() === selectedClassId) || null;
  }, [classes, selectedClassId]);

  // Filtered & Grouped Classes for Combobox
  const groupedClasses = useMemo(() => {
    if (!classes) return [];
    const query = classSearchQuery.toLowerCase().trim();

    const filtered = query
      ? classes.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            c.course?.title.toLowerCase().includes(query),
        )
      : classes;

    const map = new Map<
      number,
      { courseId: number; courseTitle: string; classes: ClassOption[] }
    >();

    filtered.forEach((cls) => {
      const courseId = cls.course?.id ?? 0;
      const courseTitle = cls.course?.title || "Khóa học chung";
      if (!map.has(courseId)) {
        map.set(courseId, { courseId, courseTitle, classes: [] });
      }
      map.get(courseId)!.classes.push(cls);
    });

    return Array.from(map.values());
  }, [classes, classSearchQuery]);

  const enrolledUserIds = useMemo(
    () => new Set(classDetail?.enrollments?.map((e) => e.userId) ?? []),
    [classDetail],
  );

  const enrollMutation = useMutation({
    mutationFn: async (userId: number) =>
      axiosClient.post("/admin/enroll", {
        userId,
        classId: parseInt(selectedClassId),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-class-detail", selectedClassId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-classes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Cấp quyền truy cập thành công!");
      setSelectedStudentIds([]);
    },
    onError: () => toast.error("Cấp quyền truy cập thất bại. Vui lòng thử lại."),
  });

  const bulkEnrollMutation = useMutation({
    mutationFn: async (ids: number[]) =>
      Promise.all(
        ids.map((id) =>
          axiosClient.post("/admin/enroll", {
            userId: id,
            classId: parseInt(selectedClassId),
          }),
        ),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-class-detail", selectedClassId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-classes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success(
        `Đã cấp quyền cho ${selectedStudentIds.length} học viên!`,
      );
      setSelectedStudentIds([]);
    },
    onError: () => toast.error("Có lỗi xảy ra khi cấp quyền học viên."),
  });

  const removeEnrollMutation = useMutation({
    mutationFn: async (userId: number) =>
      axiosClient.delete("/admin/enroll", {
        data: { userId, classId: parseInt(selectedClassId) },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-class-detail", selectedClassId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-classes"] });
      toast.success("Đã thu hồi quyền truy cập gói học.");
      setStudentToRemove(null);
    },
    onError: () => toast.error("Không thể thu hồi quyền truy cập."),
  });

  // Candidate students available to enroll
  const filteredCandidates = useMemo(() => {
    if (!students) return [];
    const q = searchCandidate.toLowerCase().trim();
    return students.filter(
      (s) =>
        !enrolledUserIds.has(s.id) &&
        (!q ||
          (s.profile?.fullName || "").toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.profile?.phone || "").includes(q)),
    );
  }, [students, enrolledUserIds, searchCandidate]);

  // Enrolled students filtered by search
  const filteredEnrolled = useMemo(() => {
    if (!classDetail?.enrollments) return [];
    const q = searchEnrolled.toLowerCase().trim();
    if (!q) return classDetail.enrollments;
    return classDetail.enrollments.filter(
      (e) =>
        (e.user.profile?.fullName || "").toLowerCase().includes(q) ||
        e.user.email.toLowerCase().includes(q) ||
        (e.user.profile?.phone || "").includes(q),
    );
  }, [classDetail, searchEnrolled]);

  const toggleSelectStudent = (id: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSelectAllCandidates = () => {
    if (selectedStudentIds.length === filteredCandidates.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredCandidates.map((s) => s.id));
    }
  };

  const handleSelectClass = (classId: number) => {
    setSelectedClassId(classId.toString());
    setSelectedStudentIds([]);
    setIsComboboxOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">
            <GraduationCap size={16} />
            <span>Phân quyền &amp; Truy cập</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Cấp quyền truy cập khóa học
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý quyền học viên theo từng gói học của hệ thống.
          </p>
        </div>
      </div>

      {/* Class Selector / Combobox Section */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 relative" ref={comboboxRef}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Gói học tiếp nhận <span className="text-rose-500">*</span>
            </label>
            <p className="text-xs text-slate-500 mb-2.5">
              Tìm kiếm theo tên khóa học hoặc gói học để cấp quyền cho học viên.
            </p>

            {/* Combobox Trigger */}
            <div className="relative max-w-2xl">
              <div
                className={`w-full text-left rounded-xl border transition-all flex items-center justify-between bg-white ${
                  isComboboxOpen
                    ? "border-blue-500 ring-4 ring-blue-500/10 shadow-xs"
                    : "border-slate-300 hover:border-slate-400"
                }`}
              >
                <button
                  type="button"
                  onClick={() => (isComboboxOpen ? handleCloseCombobox() : handleOpenCombobox())}
                  aria-haspopup="listbox"
                  aria-expanded={isComboboxOpen}
                  className="flex-1 text-left px-4 py-3 flex items-center gap-3 cursor-pointer focus-visible:outline-none min-w-0"
                >
                  {currentSelectedClass ? (
                    <div className="min-w-0 flex-1 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
                        <BookOpen size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 truncate max-w-[200px]">
                            {currentSelectedClass.course?.title}
                          </span>
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                            #{currentSelectedClass.id}
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 text-sm truncate mt-0.5">
                          {currentSelectedClass.name}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 text-slate-400 text-sm">
                      <Search size={18} />
                      <span>-- Tìm &amp; chọn gói học --</span>
                    </div>
                  )}
                </button>

                <div className="flex items-center gap-1.5 pr-3 text-slate-400 shrink-0">
                  {selectedClassId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClassId("");
                        setSelectedStudentIds([]);
                      }}
                      title="Bỏ chọn gói học"
                      aria-label="Bỏ chọn gói học"
                      className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => (isComboboxOpen ? handleCloseCombobox() : handleOpenCombobox())}
                    aria-label={isComboboxOpen ? "Đóng danh sách gói học" : "Mở danh sách gói học"}
                    className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    <ChevronsUpDown size={18} />
                  </button>
                </div>
              </div>

              {/* Combobox Dropdown Popover */}
              {isComboboxOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 animate-in fade-in duration-100">
                  {/* Search inside Dropdown */}
                  <div className="relative mb-3">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={classSearchQuery}
                      onChange={(e) => setClassSearchQuery(e.target.value)}
                      placeholder="Gõ tên gói học hoặc tên khóa học..."
                      className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-800"
                    />
                    {classSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setClassSearchQuery("")}
                        aria-label="Xóa từ khóa tìm kiếm"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Options List Grouped by Course */}
                  <div className="max-h-80 overflow-y-auto space-y-3.5 pr-1 divide-y divide-slate-100">
                    {isLoadingClasses ? (
                      <div className="p-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                        <Loader2 size={18} className="animate-spin text-blue-600" />
                        <span>Đang tải danh sách gói học...</span>
                      </div>
                    ) : groupedClasses.length > 0 ? (
                      groupedClasses.map((group) => (
                        <div key={group.courseId} className="pt-2 first:pt-0">
                          <div className="flex items-center justify-between px-2 mb-1.5">
                            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                              <BookOpen size={13} className="text-blue-600" />
                              {group.courseTitle}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400">
                              {group.classes.length} gói
                            </span>
                          </div>

                          <div className="space-y-1">
                            {group.classes.map((c) => {
                              const isSelected = selectedClassId === c.id.toString();
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => handleSelectClass(c.id)}
                                  className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between gap-3 cursor-pointer ${
                                    isSelected
                                      ? "bg-blue-50 border border-blue-200"
                                      : "hover:bg-slate-50 border border-transparent"
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <p
                                      className={`text-sm font-semibold truncate ${
                                        isSelected ? "text-blue-900 font-bold" : "text-slate-800"
                                      }`}
                                    >
                                      {c.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                      <span>Mã gói: #{c.id}</span>
                                      <span>•</span>
                                      <span>
                                        {c.studentCount ?? c.activeEnrollmentCount ?? 0} học viên
                                      </span>
                                    </div>
                                  </div>

                                  {isSelected && (
                                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                                      <Check size={14} />
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-500 text-sm">
                        <AlertCircle size={24} className="text-slate-300 mx-auto mb-2" />
                        <p>Không tìm thấy gói học nào khớp với từ khóa.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Info Badge for selected class */}
          {currentSelectedClass && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-4 shrink-0">
              <div className="text-center px-2 border-r border-slate-200">
                <span className="block text-xl font-extrabold text-slate-900">
                  {classDetail?._count?.enrollments ?? currentSelectedClass.studentCount ?? 0}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Đã có quyền truy cập
                </span>
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Đang mở
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Khóa học: <strong className="text-slate-700">{currentSelectedClass.course?.title}</strong>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace: Left (Candidate Students) + Right (Enrolled Students) */}
      {selectedClassId ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Student Picker */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 flex flex-col overflow-hidden">
            {/* Header & Controls */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                  <UserPlus size={18} className="text-blue-600" />
                  <span>Học viên có thể thêm</span>
                </h3>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-200/80 text-slate-700">
                  {filteredCandidates.length} học viên
                </span>
              </div>

              {/* Search candidate students */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Tìm học viên theo tên, email, SĐT..."
                  value={searchCandidate}
                  onChange={(e) => setSearchCandidate(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-800"
                />
                {searchCandidate && (
                  <button
                    type="button"
                    onClick={() => setSearchCandidate("")}
                    aria-label="Xóa từ khóa tìm kiếm học viên"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Bulk actions tool strip */}
              {filteredCandidates.length > 0 && (
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-200/60 text-xs">
                  <button
                    type="button"
                    onClick={toggleSelectAllCandidates}
                    className="inline-flex items-center gap-1.5 font-bold text-slate-600 hover:text-blue-600 transition"
                  >
                    {selectedStudentIds.length === filteredCandidates.length ? (
                      <>
                        <CheckSquare size={16} className="text-blue-600" />
                        <span>Bỏ chọn tất cả ({filteredCandidates.length})</span>
                      </>
                    ) : (
                      <>
                        <Square size={16} className="text-slate-400" />
                        <span>Chọn tất cả ({filteredCandidates.length})</span>
                      </>
                    )}
                  </button>

                  <span className="font-semibold text-slate-500">
                    Đã chọn: <strong className="text-blue-600">{selectedStudentIds.length}</strong>
                  </span>
                </div>
              )}

              {/* Primary Bulk CTA button */}
              {selectedStudentIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => bulkEnrollMutation.mutate(selectedStudentIds)}
                  disabled={bulkEnrollMutation.isPending}
                  className="w-full mt-3 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {bulkEnrollMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Đang cấp quyền cho {selectedStudentIds.length} học viên...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      <span>Cấp quyền cho {selectedStudentIds.length} học viên đã chọn</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Candidate List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[500px]">
              {isLoadingStudents ? (
                <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                  <Loader2 size={20} className="animate-spin text-blue-600" />
                  <span>Đang tải danh sách học viên...</span>
                </div>
              ) : filteredCandidates.length > 0 ? (
                filteredCandidates.map((s) => {
                  const isSelected = selectedStudentIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleSelectStudent(s.id)}
                      className={`flex items-center gap-3 p-3.5 cursor-pointer transition-colors ${
                        isSelected ? "bg-blue-50/70" : "hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                      </div>

                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-sm font-bold">
                        {(s.profile?.fullName || s.email)[0].toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900 text-sm truncate">
                          {s.profile?.fullName || "Chưa cập nhật tên"}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{s.email}</p>
                        {s.profile?.phone && (
                          <p className="text-[11px] text-slate-400 truncate">{s.profile.phone}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          enrollMutation.mutate(s.id);
                        }}
                        disabled={enrollMutation.isPending}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        <UserPlus size={13} />
                        <span>Cấp quyền</span>
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="p-12 text-center text-slate-400 text-sm">
                  <Users size={32} className="text-slate-300 mx-auto mb-2" />
                  <p className="font-medium text-slate-600">
                    {searchCandidate
                      ? "Không tìm thấy học viên nào phù hợp."
                      : "Tất cả học viên trong hệ thống đã có quyền truy cập gói này."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Enrolled Students in Class */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 flex flex-col overflow-hidden">
            {/* Header & Controls */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                    <Users size={18} className="text-emerald-600" />
                    <span>Học viên đang theo học</span>
                  </h3>
                  {classDetail && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {classDetail.course?.title} — <strong>{classDetail.name}</strong>
                    </p>
                  )}
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  {classDetail?._count?.enrollments ?? 0} học viên
                </span>
              </div>

              {/* Search within enrolled students */}
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Tìm kiếm trong danh sách gói học..."
                  value={searchEnrolled}
                  onChange={(e) => setSearchEnrolled(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-slate-800"
                />
                {searchEnrolled && (
                  <button
                    type="button"
                    onClick={() => setSearchEnrolled("")}
                    aria-label="Xóa từ khóa tìm kiếm học viên trong gói học"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Enrolled Students List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[500px]">
              {isLoadingEnrolled ? (
                <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                  <Loader2 size={20} className="animate-spin text-blue-600" />
                  <span>Đang tải danh sách học viên có quyền truy cập...</span>
                </div>
              ) : filteredEnrolled.length > 0 ? (
                filteredEnrolled.map((e) => (
                  <div key={e.userId} className="flex items-center gap-3 p-3.5 hover:bg-slate-50/70 transition">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-sm font-bold">
                      {(e.user.profile?.fullName || e.user.email)[0].toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-sm truncate">
                        {e.user.profile?.fullName || "Chưa cập nhật tên"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{e.user.email}</p>

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5 flex-1 max-w-[120px]">
                          <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(0, e.progress || 0))}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-600 shrink-0">
                            {e.progress || 0}%
                          </span>
                        </div>
                        {e.joinedAt && (
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {new Date(e.joinedAt).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setStudentToRemove({
                          id: e.userId,
                          name: e.user.profile?.fullName || e.user.email,
                        })
                      }
                      title="Thu hồi quyền truy cập gói học"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 cursor-pointer"
                    >
                      <UserMinus size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-400 text-sm">
                  <BookOpen size={32} className="text-slate-300 mx-auto mb-2" />
                  <p className="font-medium text-slate-600">
                    {searchEnrolled
                      ? "Không tìm thấy học viên trong gói học theo từ khóa."
                      : "Chưa có học viên nào có quyền truy cập gói này."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State: No Class Selected */
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <Layers size={28} />
          </div>
          <h3 className="font-extrabold text-slate-900 text-lg">
            Chọn một gói học để quản lý quyền truy cập
          </h3>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            Hệ thống cho phép tìm kiếm theo khóa học, chọn từng học viên hoặc cấp quyền hàng loạt cùng lúc.
          </p>

          {/* Quick pick chips */}
          {classes && classes.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100 max-w-2xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                Gói học gợi ý chọn nhanh:
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {classes.slice(0, 5).map((cls) => (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => handleSelectClass(cls.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 text-slate-700 hover:text-blue-700 text-xs font-semibold transition cursor-pointer"
                  >
                    <BookOpen size={13} className="text-slate-400" />
                    <span>{cls.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Removing Student Enrollment */}
      {studentToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95 duration-100">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100">
              <UserMinus size={24} />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">
              Xác nhận thu hồi quyền học viên
            </h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Bạn có chắc chắn muốn thu hồi quyền truy cập của học viên{" "}
              <strong className="text-slate-900">{studentToRemove.name}</strong> khỏi gói học{" "}
              <strong className="text-slate-900">{currentSelectedClass?.name}</strong> không?
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStudentToRemove(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={removeEnrollMutation.isPending}
                onClick={() => removeEnrollMutation.mutate(studentToRemove.id)}
                className="px-4 py-2 text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {removeEnrollMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Đang thu hồi...</span>
                  </>
                ) : (
                  <span>Xác nhận thu hồi</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
