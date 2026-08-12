"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

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

  useEffect(() => {
    // Kết nối tới Backend WebSocket (mặc định port 3001 hoặc URL từ env)
    const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "http://localhost:3001";
    
    const socketInstance = io(backendUrl, {
      transports: ["websocket"],
      autoConnect: true,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
      console.log("WebSocket Connected!");
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
      console.log("WebSocket Disconnected!");
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
