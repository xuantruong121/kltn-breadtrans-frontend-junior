import React from 'react';
import { PenTool } from 'lucide-react';

export default function TeacherAssignmentsPage() {
  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col items-center justify-center text-slate-500 py-20">
      <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
        <PenTool size={40} className="text-blue-500" />
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Tính năng Chấm điểm</h1>
      <p className="text-center max-w-md">
        Tính năng này đang được phát triển. Bạn sẽ sớm có thể chấm điểm bài Writing/Speaking của học sinh tại đây.
      </p>
    </div>
  );
}
