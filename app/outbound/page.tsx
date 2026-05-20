'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listOutboundCandidates, updateOutboundCandidateStatus } from '@/lib/api';
import type { OutboundCandidateListResponse, OutboundCandidateRow } from '@/lib/types';
import { cn } from '@/lib/utils';

const STATUS_TABS = ['전체', 'pending', 'contacted', 'archived'] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: '대기중',
  contacted: '연락완료',
  archived: '보관',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  contacted: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
};

function SignalTags({ signals }: { signals: Record<string, number> | null }) {
  if (!signals || Object.keys(signals).length === 0) {
    return <span className="text-gray-400 text-xs">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(signals).map(([key, val]) => (
        <span
          key={key}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs"
        >
          {key}
          {typeof val === 'number' && val !== 1 && (
            <span className="text-blue-400">×{val}</span>
          )}
        </span>
      ))}
    </div>
  );
}

function StatusSelect({
  id,
  currentStatus,
}: {
  id: number;
  currentStatus: OutboundCandidateRow['status'];
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (status: string) => updateOutboundCandidateStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['outbound-candidates'] });
    },
  });

  return (
    <select
      value={currentStatus}
      onChange={(e) => mutation.mutate(e.target.value)}
      disabled={mutation.isPending}
      className={cn(
        'text-xs px-2 py-1 rounded border-0 font-medium cursor-pointer',
        STATUS_COLORS[currentStatus] ?? 'bg-gray-100 text-gray-600',
        mutation.isPending && 'opacity-50 cursor-not-allowed',
      )}
    >
      <option value="pending">{STATUS_LABELS.pending}</option>
      <option value="contacted">{STATUS_LABELS.contacted}</option>
      <option value="archived">{STATUS_LABELS.archived}</option>
    </select>
  );
}

export default function OutboundPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('전체');

  const { data, isLoading } = useQuery<OutboundCandidateListResponse>({
    queryKey: ['outbound-candidates', { page, statusFilter }],
    queryFn: () =>
      listOutboundCandidates({
        page,
        limit: 50,
        status: statusFilter === '전체' ? undefined : statusFilter,
      }),
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">아웃바운드 마케팅 대상</h1>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStatusFilter(tab);
              setPage(1);
            }}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              statusFilter === tab
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100',
            )}
          >
            {tab === '전체' ? '전체' : STATUS_LABELS[tab]}
          </button>
        ))}
        {data && (
          <span className="ml-auto text-sm text-gray-500">
            총 {data.total.toLocaleString()}명
          </span>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">
          Loading...
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-400 bg-white rounded-xl">
          데이터가 없습니다.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">인스타그램 계정</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">점수</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">시그널</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">상태</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">등록일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.data.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <a
                      href={`https://instagram.com/${row.instagram_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      @{row.instagram_username}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-gray-700">
                      {typeof row.score === 'number' ? row.score.toFixed(2) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <SignalTags signals={row.signals_hit} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusSelect id={row.id} currentStatus={row.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(row.created_at).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-8">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
            const pageStart = Math.max(1, Math.min(page - 4, totalPages - 9));
            const p = pageStart + i;
            if (p > totalPages) return null;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={cn(
                  'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
                  p === page
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100',
                )}
              >
                {p}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
