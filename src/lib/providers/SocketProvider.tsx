"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useChatAssistantStore } from "@/stores/chatAssistantStore";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Kết nối tới Backend WebSocket
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "http://localhost:3001";
    
    const socketInstance = io(backendUrl, {
      transports: ["websocket"],
      autoConnect: true,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
      console.log("⚡ [WebSocket] Connected to server successfully! ID:", socketInstance.id);

      // Join Room cá nhân ngay khi kết nối
      if (user?.id) {
        socketInstance.emit("joinUserRoom", {
          userId: user.id,
          role: user.role,
          name: user.profile?.fullName || user.email,
        });
      }
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
      console.log("⚡ [WebSocket] Disconnected from server!");
    });

    // 🍞 1. Lắng nghe sự kiện cộng/trừ Bánh Mì Real-time
    socketInstance.on("user:currency_updated", (data: any) => {
      console.log("⚡ [WebSocket] user:currency_updated received:", data);

      if (user?.id && data.userId === user.id) {
        // Cập nhật số dư tức thì trong Store
        if (data.newBalance !== undefined) {
          useGamificationStore.getState().setBreads(data.newBalance);
        } else if (data.amount) {
          useGamificationStore.getState().addBreads(data.amount);
        }

        // Invalidate profile query để đồng bộ toàn bộ app
        queryClient.invalidateQueries({ queryKey: ["user-profile"] });

        // Hiển thị thông báo chúc mừng / thông tin
        if (data.amount > 0) {
          toast.success(`🍞 +${data.amount} Bánh Mì! Lý do: ${data.reason || "Thưởng học tập"}`, {
            duration: 6000,
            icon: "🎉",
          });
        } else if (data.amount < 0) {
          toast(`🍞 ${data.amount} Bánh Mì. Lý do: ${data.reason || "Trừ điểm"}`, {
            duration: 6000,
            icon: "⚠️",
          });
        }
      }
    });

    // 🎁 2. Lắng nghe sự kiện duyệt đơn Đổi Quà Real-time
    socketInstance.on("market:order_updated", (data: any) => {
      console.log("⚡ [WebSocket] market:order_updated received:", data);

      if (user?.id && data.userId === user.id) {
        queryClient.invalidateQueries({ queryKey: ["market-orders"] });
        queryClient.invalidateQueries({ queryKey: ["user-profile"] });

        if (data.status === "approved") {
          toast.success(`🎁 Đơn đổi quà #${data.orderId} đã được DUYỆT bởi ${data.reviewerName || "Ban Quản Trị"}!`, {
            duration: 5000,
          });
        } else {
          toast.error(`❌ Đơn đổi quà #${data.orderId} đã bị từ chối bởi ${data.reviewerName || "Ban Quản Trị"}.`, {
            duration: 5000,
          });
        }
      }
    });

    // 💬 3. Lắng nghe sự kiện Tin Nhắn Chat Mới Real-time
    socketInstance.on("chat:new_message", (payload: any) => {
      console.log("⚡ [WebSocket] chat:new_message received:", payload);
      const { studentId, studentName, studentEmail, studentAvatar, message, fromRole, targetUserId } = payload;
      const chatStore = useChatAssistantStore.getState();

      // Thêm tin nhắn vào thread tương ứng
      chatStore.addMessageToThread(
        studentId,
        { name: studentName, email: studentEmail, avatar: studentAvatar },
        message
      );

      // Thông báo Toast nếu tin nhắn đến từ đối phương
      if (user?.role === "ADMIN" || user?.role === "TEACHER") {
        if (fromRole === "STUDENT") {
          toast(`💬 ${studentName}: "${message.content.substring(0, 35)}..."`, {
            icon: "📩",
            duration: 4000,
          });
        }
      } else if (user?.role === "STUDENT") {
        if ((fromRole === "ADMIN" || fromRole === "TEACHER") && targetUserId === user.id) {
          toast(`👨‍🏫 Thầy Cô vừa trả lời bạn: "${message.content.substring(0, 35)}..."`, {
            icon: "💬",
            duration: 5000,
          });
        }
      }
    });

    // 🔄 4. Lắng nghe sự kiện Chuyển Đổi Chế Độ Chat Real-time
    socketInstance.on("chat:mode_updated", (payload: any) => {
      console.log("⚡ [WebSocket] chat:mode_updated received:", payload);
      const { studentId, mode, adminName } = payload;
      useChatAssistantStore.getState().setThreadMode(studentId, mode, adminName);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user?.id, user?.role, user?.email, user?.profile, queryClient]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
