'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  getCandidate,
  listReviews,
  listComments,
  createReview,
  createComment,
  updateCandidate,
} from '@/lib/api';
import type { CandidateRow, ReviewRow, CommentRow } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

const REVIEW_STATUSES = ['합격', '보류', '불합격'] as const;

function InfoBadge({ label, value, color }: { label: string; value: string | null; color?: string }) {
  if (!value) return null;
  return (
    <div className={cn('px-3 py-1.5 rounded-lg text-sm', color ?? 'bg-gray-100 text-gray-700')}>
      <span className="text-gray-400 text-xs mr-1">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ReviewStatusBadge({ status }: { status: string | null }) {
  const colors: Record<string, string> = {
    합격: 'bg-green-100 text-green-700',
    보류: 'bg-yellow-100 text-yellow-700',
    불합격: 'bg-red-100 text-red-700',
    미검토: 'bg-gray-100 text-gray-500',
    부적절: 'bg-red-200 text-red-800',
  };
  return (
    <span className={cn('px-3 py-1 rounded-full text-sm font-medium', colors[status ?? '미검토'] ?? 'bg-gray-100 text-gray-500')}>
      {status ?? '미검토'}
    </span>
  );
}

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const filter = searchParams.get('filter') ?? '';
  const listPage = searchParams.get('page') ?? '1';

  const [commentText, setCommentText] = useState('');
  const { user } = useAuth();
  const reviewerId = user?.email ?? '';
  const reviewerName = user?.reviewerName ?? '';

  const { data: candidate, isLoading } = useQuery<CandidateRow>({
    queryKey: ['candidate', id],
    queryFn: () => getCandidate(Number(id)),
  });

  const { data: reviews } = useQuery<ReviewRow[]>({
    queryKey: ['reviews', id],
    queryFn: () => listReviews(Number(id)),
  });

  const { data: comments } = useQuery<CommentRow[]>({
    queryKey: ['comments', id],
    queryFn: () => listComments(Number(id)),
  });

  const reviewMutation = useMutation({
    mutationFn: (status: string) =>
      createReview({ candidateId: Number(id), status: status as '합격' | '불합격' | '검토 필요' | '보류', reviewerId, reviewerName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', id] });
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
    },
  });

  const contactMutation = useMutation({
    mutationFn: (contactStatus: string) =>
      updateCandidate(Number(id), { contactStatus }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['candidate', id] }),
  });

  const commentMutation = useMutation({
    mutationFn: () =>
      createComment({ candidateId: Number(id), text: commentText, reviewerId, reviewerName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      setCommentText('');
    },
  });

  if (isLoading || !candidate) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading...
      </div>
    );
  }

  const backUrl = `/candidates${filter ? `?reviewStatus=${filter}&page=${listPage}` : `?page=${listPage}`}`;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link href={backUrl} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
          ← 목록으로 돌아가기
        </Link>
        <Link
          href={`/candidate/${Number(id) + 1}?${searchParams.toString()}`}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          다음 후보 →
        </Link>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left column: images */}
        <div className="col-span-12 md:col-span-5 space-y-4">
          {/* Main profile image */}
          <div className="relative aspect-[3/4] bg-gray-200 rounded-xl overflow-hidden">
            {candidate.profileImageUrl ? (
              <Image
                src={candidate.profileImageUrl}
                alt={candidate.username ?? ''}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl text-gray-300">👤</div>
            )}
          </div>

          {/* Best engagement post */}
          {candidate.bestPostImageUrl && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold mb-2 text-gray-500">TOP ENGAGEMENT</h3>
              <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={candidate.bestPostImageUrl}
                  alt="Best post"
                  fill
                  className="object-cover"
                />
              </div>
              {candidate.bestLikeCount && (
                <p className="text-sm text-gray-500 mt-2">
                  ❤️ {candidate.bestLikeCount.toLocaleString()} likes
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right column: info */}
        <div className="col-span-12 md:col-span-7 space-y-4">
          {/* Basic info card */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">@{candidate.username}</h2>
              <ReviewStatusBadge status={candidate.reviewStatus} />
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <InfoBadge label="타입" value={candidate.performanceType} color="bg-blue-50 text-blue-700" />
              <InfoBadge label="스킬" value={candidate.skillEvaluation} color="bg-purple-50 text-purple-700" />
              <InfoBadge label="성별" value={candidate.gender} />
              <InfoBadge label="출생" value={candidate.birthday ? String(candidate.birthday) : null} />
            </div>

            {/* Profile stats */}
            <div className="grid grid-cols-3 gap-4 py-4 border-t border-b">
              <div className="text-center">
                <p className="text-lg font-bold">{candidate.followerCount?.toLocaleString() ?? '-'}</p>
                <p className="text-xs text-gray-500">팔로워</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{candidate.postCount?.toLocaleString() ?? '-'}</p>
                <p className="text-xs text-gray-500">게시물</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{candidate.bestLikeCount?.toLocaleString() ?? '-'}</p>
                <p className="text-xs text-gray-500">최고 좋아요</p>
              </div>
            </div>

            {/* Bio */}
            {candidate.introducing && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-500 mb-1">소개</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{candidate.introducing}</p>
              </div>
            )}

            {/* AI Comment */}
            {candidate.aiComment && (
              <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
                <h3 className="text-sm font-semibold text-indigo-600 mb-1">AI 코멘트</h3>
                <p className="text-sm text-indigo-800">{candidate.aiComment}</p>
              </div>
            )}

            {/* Body info */}
            {(candidate.heightCm || candidate.weightKg) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {candidate.heightCm && (
                  <InfoBadge label="키" value={`${candidate.heightCm}cm`} />
                )}
                {candidate.weightKg && (
                  <InfoBadge label="몸무게" value={`${candidate.weightKg}kg`} />
                )}
                {candidate.bodyRecordDate && (
                  <InfoBadge label="측정일" value={candidate.bodyRecordDate} />
                )}
              </div>
            )}

            {/* Contact info */}
            {candidate.contact && (
              <div className="mt-4 flex flex-wrap gap-2">
                <InfoBadge label="연락처" value={candidate.contact} />
                {candidate.contactType && (
                  <InfoBadge label="관계" value={candidate.contactType} />
                )}
              </div>
            )}

            {/* Hashtags */}
            {candidate.usedHashtags && candidate.usedHashtags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {candidate.usedHashtags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sample images gallery */}
          {candidate.sampleImageUrls && candidate.sampleImageUrls.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">샘플 이미지</h3>
              <div className="grid grid-cols-3 gap-2">
                {candidate.sampleImageUrls.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <Image src={url} alt={`Sample ${i + 1}`} fill className="object-cover" sizes="150px" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample videos */}
          {candidate.sampleVideos && candidate.sampleVideos.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">샘플 비디오</h3>
              <div className="space-y-2">
                {candidate.sampleVideos.map((url, i) => (
                  <video key={i} src={url} controls className="w-full rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {/* Review actions */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">리뷰 하기</h3>
            <div className="flex gap-2">
              {REVIEW_STATUSES.map((status) => (
                <button
                  key={status}
                  onClick={() => reviewMutation.mutate(status)}
                  disabled={reviewMutation.isPending}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    status === '합격' && 'bg-green-500 text-white hover:bg-green-600',
                    status === '보류' && 'bg-yellow-500 text-white hover:bg-yellow-600',
                    status === '불합격' && 'bg-red-500 text-white hover:bg-red-600',
                  )}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Contact status */}
            <div className="mt-4 pt-4 border-t">
              <label className="text-sm text-gray-500 mr-2">컨택 상태:</label>
              <select
                value={candidate.contactStatus ?? '미연락'}
                onChange={(e) => contactMutation.mutate(e.target.value)}
                className="px-3 py-1.5 rounded-lg border text-sm"
              >
                {['미연락', 'DM 발송', '답변 완료', '진행 중', '거절'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Review history & comments */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold mb-4">REVIEW HISTORY</h3>

            {/* Reviews */}
            {reviews && reviews.length > 0 && (
              <div className="space-y-2 mb-4">
                {reviews.map((review) => (
                  <div key={review.id} className="flex items-center gap-2 text-sm">
                    <ReviewStatusBadge status={review.status} />
                    <span className="text-gray-500">{review.reviewerName ?? review.reviewerId}</span>
                    <span className="text-gray-400 text-xs">
                      {review.createdAt ? new Date(review.createdAt).toLocaleDateString('ko-KR') : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Comments */}
            {comments && comments.length > 0 && (
              <div className="space-y-3 mb-4 pt-4 border-t">
                {comments.map((comment) => (
                  <div key={comment.id} className="text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{comment.reviewerName ?? comment.reviewerId}</span>
                      <span className="text-gray-400 text-xs">
                        {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('ko-KR') : ''}
                      </span>
                    </div>
                    <p className="text-gray-700">{comment.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Comment form */}
            <div className="flex gap-2 pt-4 border-t">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && commentText.trim()) commentMutation.mutate();
                }}
                placeholder="코멘트를 입력하세요..."
                className="flex-1 px-3 py-2 rounded-lg border text-sm"
              />
              <button
                onClick={() => commentMutation.mutate()}
                disabled={!commentText.trim() || commentMutation.isPending}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                작성
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
