'use client';

import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '@/lib/api';
import type { DashboardStats } from '@/lib/types';

function StatCard({
  label,
  value,
  icon,
  bgColor,
}: {
  label: string;
  value: number | string;
  icon: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center text-lg`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        </div>
      </div>
    </div>
  );
}

function HashtagProgress({
  tag,
  count,
  total,
}: {
  tag: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{tag}</span>
        <span className="text-gray-500">
          {count.toLocaleString()} ({pct}%)
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'RUNNING' | 'IDLE' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
        status === 'RUNNING'
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-500'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          status === 'RUNNING' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
        }`}
      />
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">데이터를 불러올 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <StatusBadge status={data.scraper_status} />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left column */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="확인 게시물 수" value={data.total_rows} icon="📋" bgColor="bg-blue-50" />
            <StatCard label="고유 계정 수" value={data.total_rows} icon="👤" bgColor="bg-purple-50" />
            <StatCard label="오늘 추가됨" value={data.today_added} icon="📥" bgColor="bg-green-50" />
            <StatCard label="미검토 인원 수" value={data.queue_size} icon="⏳" bgColor="bg-orange-50" />
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">해시태그 스크래핑 현황</h2>
            <div className="space-y-4">
              <HashtagProgress tag="#아이돌지망생" count={data.hashtag_1_seen} total={data.total_rows} />
              <HashtagProgress tag="#연습생" count={data.hashtag_2_seen} total={data.total_rows} />
              <HashtagProgress tag="#오디션" count={data.hashtag_3_seen} total={data.total_rows} />
            </div>
            {data.queue_size > 0 && (
              <div className="mt-4 pt-4 border-t text-sm text-gray-500">
                다음 대기열: {data.queue_size.toLocaleString()}명 (예상 {data.estimated_days}일)
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">수동 투입 인원</h2>
            <p className="text-sm text-gray-500 mb-2">킨즈 서울 팔로워/수강생</p>
            <div className="text-3xl font-bold text-gray-900">-</div>
            <p className="text-xs text-gray-400 mt-2">별도 데이터 소스 연동 예정</p>
          </div>
        </div>
      </div>
    </div>
  );
}
