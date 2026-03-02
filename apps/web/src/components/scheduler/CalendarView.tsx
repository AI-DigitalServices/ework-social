'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const platformIcons: Record<string, string> = {
  FACEBOOK: '📘', INSTAGRAM: '📸', TWITTER: '🐦',
  LINKEDIN: '💼', TIKTOK: '🎵', YOUTUBE: '▶️',
};

interface Props {
  posts: any[];
}

export default function CalendarView({ posts }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getPostsForDay = (day: number) => {
    return posts.filter(post => {
      if (!post.scheduledAt) return false;
      const d = new Date(post.scheduledAt);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-800">{monthName}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1))}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition font-medium"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1))}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {days.map(day => (
          <div key={day} className="py-3 text-center text-xs font-semibold text-slate-500 uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {/* Empty cells for first week */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-24 border-r border-b border-slate-50 bg-slate-50/50" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayPosts = getPostsForDay(day);
          const isToday =
            today.getDate() === day &&
            today.getMonth() === month &&
            today.getFullYear() === year;

          return (
            <div
              key={day}
              className="h-24 border-r border-b border-slate-100 p-1.5 overflow-hidden hover:bg-slate-50 transition"
            >
              <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1 ${
                isToday ? 'bg-blue-600 text-white font-bold' : 'text-slate-700'
              }`}>
                {day}
              </div>
              <div className="space-y-0.5">
                {dayPosts.slice(0, 2).map(post => (
                  <div
                    key={post.id}
                    className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 truncate"
                    title={post.content}
                  >
                    {platformIcons[post.socialAccount?.platform]} {post.content.slice(0, 15)}...
                  </div>
                ))}
                {dayPosts.length > 2 && (
                  <div className="text-xs text-slate-400 px-1">+{dayPosts.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
