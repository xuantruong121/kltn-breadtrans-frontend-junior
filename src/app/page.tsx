"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, BookOpen, GraduationCap, School, Loader2, Croissant } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useQueryClient } from "@tanstack/react-query";

const emptySubscribe = () => () => {};

function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          <label className="block text-lg font-bold text-slate-700 mb-3">Mật khẩu bí mật</label>
          <input 
            type="password"
            data-testid="login-password" 
            placeholder="••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full font-sans text-xl p-5 bg-white border-4 border-slate-200 rounded-2xl focus:outline-none focus:border-junior-blue transition-colors shadow-sm"
          />
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
    <main className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-2">
      {/* LEFT SIDE: VISUAL ART (Anti Center-Bias) */}
      <section className="relative bg-junior-blue hidden lg:flex flex-col justify-center items-center overflow-hidden p-12">
        {/* TYPOGRAPHIC LOGO PLACEMENT */}
        <div className="absolute top-12 left-12 z-20 flex items-center gap-5">
          <div className="bg-white text-junior-orange p-4 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-2 border-white/50 rotate-[-8deg] hover:rotate-0 transition-transform">
            <Croissant size={52} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-5xl font-extrabold tracking-tight text-white drop-shadow-sm leading-none">
              Bread<span className="text-orange-300">Trans</span>
            </span>
            <span className="text-sky-200 font-bold text-lg tracking-widest uppercase mt-2">Junior</span>
          </div>
        </div>

        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 80, ease: "linear" }}
          className="absolute -top-32 -left-32 text-sky-400 opacity-20"
        >
          <Sparkles size={600} strokeWidth={1} />
        </motion.div>

        <div className="relative z-10 w-full max-w-lg">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: -2 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
            className="bg-white p-8 rounded-[3rem] shadow-2xl border-8 border-sky-300 flex items-center gap-6 mb-8"
          >
            <div className="bg-orange-100 p-6 rounded-full text-junior-orange">
              <School size={64} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-800">Trường học vui</h2>
              <p className="text-xl text-slate-500 font-medium">Nơi phép màu bắt đầu</p>
            </div>
          </motion.div>

          <div className="flex gap-8 ml-12">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", bounce: 0.6, delay: 0.4 }}
              className="bg-junior-green p-6 rounded-[2rem] shadow-xl border-4 border-green-400 text-white flex-1"
            >
              <BookOpen size={48} className="mb-4" />
              <h3 className="text-2xl font-bold">Từ vựng</h3>
            </motion.div>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0, rotate: 6 }}
              transition={{ type: "spring", bounce: 0.6, delay: 0.5 }}
              className="bg-purple-500 p-6 rounded-[2rem] shadow-xl border-4 border-purple-400 text-white flex-1 mt-12"
            >
              <GraduationCap size={48} className="mb-4" />
              <h3 className="text-2xl font-bold">Luyện nói</h3>
            </motion.div>
          </div>
        </div>
      </section>

      {/* RIGHT SIDE: FORM STAGGER REVEAL */}
      <section className="bg-sky-50 flex items-center justify-center p-6 md:p-12 lg:p-24 relative">
        
        {/* STAGGER FORM MOUNT */}
        <LoginForm />
      </section>
    </main>
  );
}
