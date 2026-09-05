"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useQueryClient } from "@tanstack/react-query";
import { AuthShell } from "@/components/auth/AuthShell";

const emptySubscribe = () => () => {};

function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const { user, setAuth } = useAuthStore();
  const isReady = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Auto redirect if already logged in
  useEffect(() => {
    if (isReady && user) {
      if (user.role === "ADMIN") {
        router.push("/admin");
      } else if (user.role === "TEACHER") {
        router.push("/teacher/dashboard");
      } else {
        router.push("/dashboard");
      }
    }
  }, [isReady, user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Vui lòng nhập đầy đủ email và mật khẩu nhé!");
      return;
    }
    
    setIsLoading(true);
    setErrorMsg("");
    
    try {
      let deviceId = typeof window !== 'undefined' ? localStorage.getItem('deviceId') : null;
      if (!deviceId && typeof window !== 'undefined') {
        deviceId = crypto.randomUUID();
        localStorage.setItem('deviceId', deviceId);
      }
      
      const res: any = await axiosClient.post('/auth/login', { email, password, deviceId });
      // Clear any previous user's cached queries and gamification store
      queryClient.clear();
      useGamificationStore.getState().reset();

      // API trả về { access_token, refresh_token, user: { id, email, role, profile } }
      setAuth(res.access_token, res.refresh_token, res.user);
      
      if (res.user.role === 'ADMIN') {
        router.push('/admin');
      } else if (res.user.role === 'TEACHER') {
        router.push('/teacher/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.response?.data?.message || "Đăng nhập thất bại. Kiểm tra lại thông tin nhé!");
    } finally {
      setIsLoading(false);
    }
  };

  const formItems = [
    {
      id: "header",
      element: (
        <div className="mb-8">
          <h1 className="text-5xl lg:text-6xl font-bold text-slate-800 mb-4 tracking-tight">
            Sẵn sàng <br/>
            <span className="text-junior-blue">khám phá!</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-sm">
            Đăng nhập để vào lớp học BreadTrans và nhận vô vàn phần thưởng hấp dẫn.
          </p>
        </div>
      )
    },
    {
      id: "error",
      element: errorMsg ? (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-red-100 text-red-600 rounded-xl font-bold"
        >
          {errorMsg}
        </motion.div>
      ) : null
    },
    {
      id: "email",
      element: (
        <div className="mb-6">
          <label className="block text-lg font-bold text-slate-700 mb-3">Email của bạn</label>
          <input 
            type="email"
            data-testid="login-email" 
            placeholder="Ví dụ: hocsinh@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full font-sans text-xl p-5 bg-white border-4 border-slate-200 rounded-2xl focus:outline-none focus:border-junior-blue transition-colors shadow-sm"
          />
        </div>
      )
    },
    {
      id: "password",
      element: (
        <div className="mb-10">
          <label className="block text-lg font-bold text-slate-700 mb-3">Mật khẩu bí mật</label>          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              data-testid="login-password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full font-sans text-xl p-5 pr-16 bg-white border-4 border-slate-200 rounded-2xl focus:outline-none focus:border-junior-blue transition-colors shadow-sm"
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPassword} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
              {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
            </button>
          </div>
        </div>
      )
    },
    {
      id: "submit",
      element: (
        <motion.button
          type="submit"
          data-testid="login-submit"
          disabled={isLoading}
          whileHover={{ scale: isLoading ? 1 : 1.02 }}
          whileTap={{ scale: isLoading ? 1 : 0.98 }}
          className={`btn-orange-3d w-full flex items-center justify-center gap-3 text-white text-2xl font-bold p-5 rounded-2xl ${isLoading ? 'bg-slate-400 opacity-80 cursor-not-allowed' : 'bg-junior-orange hover:bg-junior-orange-dark'}`}
        >
          {isLoading ? (
             <><Loader2 className="animate-spin" size={32} /> Đang tải...</>
          ) : (
             <>Vào Học Ngay <ArrowRight size={32} strokeWidth={3} /></>
          )}
        </motion.button>
      )
    },
    {
      id: "register",
      element: (
        <div className="mt-6 flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-center">
          <span className="text-base font-medium text-slate-600">
            Chưa có tài khoản?
          </span>
          <Link
            href="/register"
            data-testid="register-link"
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 font-bold text-junior-blue underline decoration-2 underline-offset-4 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-junior-blue/30"
          >
            Đăng ký học viên
          </Link>
        </div>
      )
    }
  ];

  return (
    <form onSubmit={handleLogin} className="w-full max-w-md mx-auto xl:mx-0">
      {formItems.map((item, i) => {
        if (!item.element) return null;
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{
              duration: 0.7,
              delay: i * 0.1,
              ease: [0.16, 1, 0.3, 1], // Spring-like ease out
            }}
          >
            {item.element}
          </motion.div>
        );
      })}
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}