import axiosClient from "@/lib/api/axiosClient";

export interface DailySessionInput {
  id?: number;
  title?: string;
  meetingLink?: string;
  startTime?: string | Date;
  endTime?: string | Date;
}

/**
 * Mở phòng học trực tuyến Daily.co trực tiếp trong Cửa sổ / Tab mới.
 * Sử dụng kỹ thuật mở cửa sổ ngay khi click để tránh bị trình duyệt chặn Pop-up.
 */
export async function openDailyClassroomSession(session: DailySessionInput) {
  // 1. Mở cửa sổ mới ngay lập tức để không bị browser pop-up blocker chặn
  const newWindow = window.open("about:blank", "_blank");

  if (newWindow) {
    newWindow.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Đang kết nối phòng học... - BreadTrans</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: #0f172a;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
            text-align: center;
          }
          .card {
            background: rgba(30, 41, 59, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 40px 32px;
            border-radius: 24px;
            max-width: 440px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(12px);
          }
          .logo {
            font-size: 36px;
            margin-bottom: 16px;
            display: inline-block;
            animation: pulse 2s infinite;
          }
          .spinner {
            width: 44px;
            height: 44px;
            border: 4px solid rgba(255, 255, 255, 0.1);
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 24px auto;
          }
          h2 {
            font-size: 20px;
            font-weight: 800;
            margin-bottom: 8px;
            color: #ffffff;
          }
          p {
            font-size: 13px;
            color: #94a3b8;
            line-height: 1.5;
          }
          .session-title {
            color: #60a5fa;
            font-weight: 700;
            margin-top: 6px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">🍞</div>
          <div class="spinner"></div>
          <h2>Đang kết nối tới Lớp học trực tuyến</h2>
          <p class="session-title">${session.title || "Lớp học trực tuyến BreadTrans"}</p>
          <p style="margin-top: 12px; font-size: 12px;">Hệ thống đang mở phòng học Daily.co chuẩn WebRTC chất lượng cao cho bạn...</p>
        </div>
      </body>
      </html>
    `);
  }

  try {
    let targetName = "";
    if (session.meetingLink && session.meetingLink.includes("daily.co")) {
      const parts = session.meetingLink.split("/").filter(Boolean);
      targetName = parts[parts.length - 1]?.split("?")[0] || "";
    }

    if (!targetName) {
      targetName = (session.title || "classroom")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 38);
    }

    const res: any = await axiosClient.post("/classes/daily-room", {
      title: session.title,
      roomName: targetName || "live-class",
      endTime: session.endTime,
    });

    const finalUrl =
      res?.url ||
      res?.data?.url ||
      (session.meetingLink && session.meetingLink.includes("daily.co")
        ? session.meetingLink
        : `https://breadtrans-kltn.daily.co/${targetName || "live-class"}`);

    if (newWindow) {
      newWindow.location.href = finalUrl;
    } else {
      window.open(finalUrl, "_blank");
    }
  } catch (err) {
    console.warn("Could not auto-create Daily room via API, falling back:", err);
    const fallbackUrl =
      session.meetingLink && session.meetingLink.includes("daily.co")
        ? session.meetingLink
        : "https://breadtrans-kltn.daily.co/live-class";

    if (newWindow) {
      newWindow.location.href = fallbackUrl;
    } else {
      window.open(fallbackUrl, "_blank");
    }
  }
}
