"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axiosClient from "@/lib/api/axiosClient";
import { Eye, EyeOff } from "lucide-react";

function ActivationForm() {
  const params = useSearchParams(); const router = useRouter();
  const [newPassword, setNewPassword] = useState(""); const [showPassword, setShowPassword] = useState(false); const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => { event.preventDefault(); try { await axiosClient.post("/auth/activate-teacher", { token: params.get("token"), newPassword }); router.push("/"); } catch (err: any) { setError(err?.response?.data?.message || "Liên kết không hợp lệ."); } };
  return <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl"><h1 className="text-2xl font-black">Kích hoạt tài khoản Teacher</h1><div className="relative"><input required minLength={8} type={showPassword ? "text" : "password"} placeholder="Mật khẩu mới" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-xl border p-3 pr-12" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword} className="absolute right-3 top-1/2 -translate-y-1/2">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><button className="w-full rounded-xl bg-blue-600 p-3 font-bold text-white">Kích hoạt</button>{error && <p className="text-red-600">{error}</p>}</form>;
}
export default function ActivateTeacherPage() { return <main className="min-h-screen flex items-center justify-center p-6"><Suspense fallback={<p>Đang tải...</p>}><ActivationForm /></Suspense></main>; }