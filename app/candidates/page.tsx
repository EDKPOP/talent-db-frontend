'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { listCandidates, bulkUpdateCandidates } from '@/lib/api';
import type { CandidateListResponse, CandidateWithExtras } from '@/lib/types';
import { cn } from '@/lib/utils';

const REVIEW_STATUS_TABS = ['전체', '합격', '보류', '불합격', '미검토'] as const;
const GENDER_OPTIONS = ['전체', '남성', '여성'] as const;
const BIRTH_YEARS = Array.from({ length: 14 }, (_, i) => 2006 + i); // 2006-2019

function CandidateCard({
  candidate,
  selected,
  onSelect,
  onClick,
}: {
  candidate: CandidateWithExtras;
  selected: boolean;
  onSelect: (id: number) => void;
  onClick: (id: number) => void;
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow relative group',
        selected && 'ring-2 ring-blue-500',
      )}
      onClick={() => onClick(candidate.id)}
    >
      {/* Selection checkbox */}
      <div
        className="absolute top-2 left-2 z-10"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(candidate.id);
        }}
      >
        <div
          className={cn(
            'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
            selected
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'border-white/70 bg-black/20 opacity-0 group-hover:opacity-100',
          )}
        >
          {selected && <span className="text-xs">✓</span>}
        </div>
      </div>

      {/* Profile image */}
      <div className="relative aspect-[3/4] bg-gray-200">
        {candidate.profileImageUrl ? (
          <Image
            src={candidate.profileImageUrl}
            alt={candidate.username ?? ''}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
            👤
          </div>
        )}
        {/* Username overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
          <p className="text-white text-sm font-semibold truncate">
            @{candidate.username}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {candidate.gender && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              {candidate.gender}
            </span>
          )}
          {candidate.performanceType && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
              {candidate.performanceType}
            </span>
          )}
          {candidate.skillEvaluation && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">
              {candidate.skillEvaluation}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CandidatesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [reviewStatus, setReviewStatus] = useState<string>('전체');
  const [gender, setGender] = useState<string>('전체');
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [includeUnknownBirthYear, setIncludeUnknownBirthYear] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery<CandidateListResponse>({
    queryKey: ['candidates', { page, reviewStatus, gender, selectedYears, includeUnknownBirthYear }],
    queryFn: () =>
      listCandidates({
        page,
        limit: 20,
        reviewStatus: reviewStatus === '전체' ? undefined : reviewStatus,
        gender: gender === '전체' ? undefined : gender,
        birthYears: selectedYears.length > 0 ? selectedYears.join(',') : undefined,
        includeUnknownBirthYear: includeUnknownBirthYear ? 'true' : undefined,
      }),
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCardClick = (id: number) => {
    const params = new URLSearchParams();
    if (reviewStatus !== '전체') params.set('filter', reviewStatus);
    params.set('page', String(page));
    router.push(`/candidate/${id}?${params.toString()}`);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedIds.size === 0) return;
    await bulkUpdateCandidates({
      ids: Array.from(selectedIds),
      updates: { reviewStatus: action },
    });
    setSelectedIds(new Set());
  };

  const toggleYear = (year: number) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year],
    );
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">지원자 목록</h1>

      {/* Review status tabs */}
      <div className="flex items-center gap-2 mb-4">
        {REVIEW_STATUS_TABS.map((tab) => {
          const count = data?.counts
            ? tab === '전체'
              ? data.counts.전체
              : data.counts[tab as keyof typeof data.counts]
            : 0;
          return (
            <button
              key={tab}
              onClick={() => {
                setReviewStatus(tab);
                setPage(1);
              }}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                reviewStatus === tab
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100',
              )}
            >
              {tab}
              <span className="ml-1.5 text-xs opacity-70">
                {typeof count === 'number' ? count.toLocaleString() : 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <select
          value={gender}
          onChange={(e) => {
            setGender(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg border bg-white text-sm"
        >
          {GENDER_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g === '전체' ? '성별: 전체' : g}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-sm text-gray-500 mr-1">출생연도:</span>
          {BIRTH_YEARS.map((year) => (
            <button
              key={year}
              onClick={() => toggleYear(year)}
              className={cn(
                'px-2 py-1 text-xs rounded transition-colors',
                selectedYears.includes(year)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {year}
            </button>
          ))}
          <button
            onClick={() => { setIncludeUnknownBirthYear((v) => !v); setPage(1); }}
            className={cn(
              'px-2 py-1 text-xs rounded transition-colors',
              includeUnknownBirthYear
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            미확인
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size}명 선택됨</span>
          <button
            onClick={() => handleBulkAction('합격')}
            className="px-3 py-1 text-xs rounded bg-green-500 text-white hover:bg-green-600"
          >
            합격
          </button>
          <button
            onClick={() => handleBulkAction('보류')}
            className="px-3 py-1 text-xs rounded bg-yellow-500 text-white hover:bg-yellow-600"
          >
            보류
          </button>
          <button
            onClick={() => handleBulkAction('불합격')}
            className="px-3 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600"
          >
            불합격
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300 ml-auto"
          >
            선택 해제
          </button>
        </div>
      )}

      {/* Card grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">
          Loading...
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {data?.data.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              selected={selectedIds.has(candidate.id)}
              onSelect={toggleSelect}
              onClick={handleCardClick}
            />
          ))}
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
