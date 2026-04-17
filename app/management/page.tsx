'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { listCandidates, updateCandidate, listReviewsBulk } from '@/lib/api';
import type { CandidateListResponse, CandidateWithExtras, ReviewRow } from '@/lib/types';
import { cn } from '@/lib/utils';

const CONTACT_STATUSES = ['미연락', '진행 중', '거절', '승인'] as const;
const STATUS_COLORS: Record<string, string> = {
  미연락: 'bg-gray-100 text-gray-600',
  '진행 중': 'bg-blue-100 text-blue-700',
  거절: 'bg-red-100 text-red-700',
  승인: 'bg-green-100 text-green-700',
};

function ReviewCountIcons({ reviews }: { reviews: ReviewRow[] }) {
  const counts = { 합격: 0, 보류: 0, 불합격: 0 };
  for (const r of reviews) {
    if (r.status in counts) counts[r.status as keyof typeof counts]++;
  }
  return (
    <div className="flex items-center gap-2 text-xs">
      {counts.합격 > 0 && <span className="text-green-600">O {counts.합격}</span>}
      {counts.보류 > 0 && <span className="text-yellow-600">△ {counts.보류}</span>}
      {counts.불합격 > 0 && <span className="text-red-600">X {counts.불합격}</span>}
    </div>
  );
}

function ManagementCard({
  candidate,
  reviews,
  onContactChange,
  navParams,
}: {
  candidate: CandidateWithExtras;
  reviews: ReviewRow[];
  onContactChange: (id: number, status: string) => void;
  navParams: string;
}) {
  const currentContact = candidate.contactStatus ?? '미연락';
  const displayContact = CONTACT_STATUSES.includes(currentContact as typeof CONTACT_STATUSES[number])
    ? currentContact
    : '미연락';

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Contact status select */}
      <div className="p-2">
        <select
          value={displayContact}
          onChange={(e) => onContactChange(candidate.id, e.target.value)}
          className={cn(
            'w-full px-2 py-1 rounded text-xs font-medium border-0',
            STATUS_COLORS[displayContact] ?? 'bg-gray-100 text-gray-600',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {CONTACT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Profile image + username */}
      <Link href={`/candidate/${candidate.id}?${navParams}`}>
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
            <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">👤</div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
            <p className="text-white text-sm font-semibold truncate">@{candidate.username}</p>
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
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

        <ReviewCountIcons reviews={reviews} />

        {/* Latest comment as activity */}
        {candidate.latestComment?.text && (
          <p className="text-xs text-gray-400 truncate">
            {candidate.latestComment.text}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ManagementPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [gender, setGender] = useState<string>('전체');
  const [reviewStatus, setReviewStatus] = useState<string>('전체');
  const [selectedReviewer, setSelectedReviewer] = useState<string>('전체');

  const statuses = reviewStatus === '전체' ? '합격,보류,불합격' : reviewStatus;

  const { data, isLoading } = useQuery<CandidateListResponse>({
    queryKey: ['management-candidates', { page, gender, statuses }],
    queryFn: () =>
      listCandidates({
        page,
        limit: 20,
        reviewStatuses: statuses,
        gender: gender === '전체' ? undefined : gender,
      }),
  });

  const candidateIds = data?.data.map((c) => c.id) ?? [];

  const { data: reviewsData } = useQuery<ReviewRow[]>({
    queryKey: ['management-reviews', candidateIds],
    queryFn: () => listReviewsBulk(candidateIds),
    enabled: candidateIds.length > 0,
  });

  const reviewsByCandidate = new Map<number, ReviewRow[]>();
  if (reviewsData) {
    for (const r of reviewsData) {
      const arr = reviewsByCandidate.get(r.candidateId) ?? [];
      arr.push(r);
      reviewsByCandidate.set(r.candidateId, arr);
    }
  }

  // Build distinct reviewer list from loaded reviews
  const reviewerOptions = (() => {
    if (!reviewsData) return [];
    const nameMap = new Map<string, string>();
    for (const r of reviewsData) {
      if (r.reviewerId) {
        nameMap.set(r.reviewerId, r.reviewerName ?? r.reviewerId);
      }
    }
    return Array.from(nameMap.entries()).map(([id, name]) => ({ id, name }));
  })();

  // Filter candidates client-side by selected reviewer
  const filteredCandidates = (() => {
    if (!data?.data) return [];
    if (selectedReviewer === '전체') return data.data;
    return data.data.filter((c) => {
      const reviews = reviewsByCandidate.get(c.id) ?? [];
      return reviews.some((r) => r.reviewerId === selectedReviewer);
    });
  })();

  const contactMutation = useMutation({
    mutationFn: ({ id, contactStatus }: { id: number; contactStatus: string }) =>
      updateCandidate(id, { contactStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['management-candidates'] }),
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const navParams = new URLSearchParams({
    source: 'management',
    reviewStatuses: statuses,
    page: String(page),
    ...(gender !== '전체' ? { gender } : {}),
  }).toString();

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">합격 후보 관리</h1>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <select
          value={gender}
          onChange={(e) => { setGender(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border bg-white text-sm"
        >
          <option value="전체">성별: 전체</option>
          <option value="여성">여성</option>
          <option value="남성">남성</option>
        </select>

        <select
          value={reviewStatus}
          onChange={(e) => { setReviewStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border bg-white text-sm"
        >
          <option value="전체">상태: 전체</option>
          <option value="합격">합격</option>
          <option value="보류">보류</option>
          <option value="불합격">불합격</option>
        </select>

        <select
          value={selectedReviewer}
          onChange={(e) => { setSelectedReviewer(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border bg-white text-sm"
        >
          <option value="전체">검토자: 전체</option>
          {reviewerOptions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        {data && (
          <span className="text-sm text-gray-500 ml-auto">
            총 {data.total}명 중 {(page - 1) * data.limit + 1}-
            {Math.min(page * data.limit, data.total)} 표시
          </span>
        )}
      </div>

      {/* Card grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-gray-400">
          Loading...
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredCandidates.map((candidate) => (
            <ManagementCard
              key={candidate.id}
              candidate={candidate}
              reviews={reviewsByCandidate.get(candidate.id) ?? []}
              onContactChange={(id, contactStatus) =>
                contactMutation.mutate({ id, contactStatus })
              }
              navParams={navParams}
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
