import axios from 'axios';
import { isUnauthorizedError, setApiAuthStatus } from './api-auth';
import type {
  CandidateRow,
  CandidateListResponse,
  CreateCandidateBody,
  PatchCandidateBody,
  BulkPatchBody,
  ListQuery,
  ReviewRow,
  CreateReviewBody,
  CommentRow,
  CreateCommentBody,
  DashboardStats,
  OutboundCandidateRow,
  OutboundCandidateListResponse,
} from './types';

/**
 * 모든 데이터 요청은 같은 오리진의 서버 라우트 프록시를 거친다.
 *
 * bearer 토큰은 서버 env 전용이고 브라우저는 보지 못한다 (COU-2079 결정 2(a)).
 * Authorization 헤더는 `app/api/proxy/[...path]/route.ts` 가 서버에서 붙이므로
 * 여기에는 인증 관련 코드가 없다. 아래 API 함수들의 시그니처·경로는 그대로다.
 */
const api = axios.create({
  baseURL: '/api/proxy',
  headers: { 'Content-Type': 'application/json' },
});

// 401 은 전역 상태로만 알린다. 여기서 재시도하거나 리다이렉트하지 않는다
// — 로그인 화면은 API 토큰을 발급하지 않으므로 리다이렉트하면 루프가 된다.
api.interceptors.response.use(
  (response) => {
    setApiAuthStatus('ok');
    return response;
  },
  (error: unknown) => {
    if (isUnauthorizedError(error)) {
      setApiAuthStatus('unauthorized');
    }
    return Promise.reject(error);
  },
);

// ── Candidates ──────────────────────────────────────────

export async function listCandidates(params: ListQuery): Promise<CandidateListResponse> {
  const { data } = await api.get<CandidateListResponse>('/candidates', { params });
  return data;
}

function parseJsonField<T>(value: unknown): T | null {
  if (Array.isArray(value)) return value as T;
  if (typeof value === 'string') {
    try { return JSON.parse(value) as T; } catch { return null; }
  }
  return null;
}

export async function getCandidate(id: number): Promise<CandidateRow> {
  const { data } = await api.get<{ data: CandidateRow }>(`/candidates/${id}`);
  const c = data.data;
  c.usedHashtags = parseJsonField<string[]>(c.usedHashtags);
  c.sampleImageUrls = parseJsonField<string[]>(c.sampleImageUrls) ?? [];
  c.sampleVideos = parseJsonField<string[]>(c.sampleVideos) ?? [];
  return c;
}

export async function createCandidate(body: CreateCandidateBody): Promise<CandidateRow> {
  const { data } = await api.post<{ data: CandidateRow }>('/candidates', body);
  return data.data;
}

export async function updateCandidate(id: number, body: PatchCandidateBody): Promise<CandidateRow> {
  const { data } = await api.patch<{ data: CandidateRow }>(`/candidates/${id}`, body);
  return data.data;
}

export async function bulkUpdateCandidates(body: BulkPatchBody): Promise<{ updated: number; ids: number[] }> {
  const { data } = await api.patch<{ updated: number; ids: number[] }>('/candidates/bulk', body);
  return data;
}

export async function deleteCandidate(id: number): Promise<void> {
  await api.delete(`/candidates/${id}`);
}

// ── Reviews ─────────────────────────────────────────────

export async function listReviews(candidateId: number): Promise<ReviewRow[]> {
  const { data } = await api.get<{ data: ReviewRow[] }>('/reviews', {
    params: { candidateId },
  });
  return data.data;
}

export async function listReviewsBulk(candidateIds: number[]): Promise<ReviewRow[]> {
  const { data } = await api.get<{ data: ReviewRow[] }>('/reviews', {
    params: { candidateIds: candidateIds.join(',') },
  });
  return data.data;
}

export async function listDistinctReviewers(): Promise<{ id: string; name: string }[]> {
  const { data } = await api.get<{ data: { id: string; name: string }[] }>('/reviews/reviewers');
  return data.data;
}

export async function createReview(body: CreateReviewBody): Promise<ReviewRow> {
  const { data } = await api.post<{ data: ReviewRow }>('/reviews', body);
  return data.data;
}

export async function updateReview(id: number, body: { status?: string; reviewerName?: string }): Promise<ReviewRow> {
  const { data } = await api.patch<{ data: ReviewRow }>(`/reviews/${id}`, body);
  return data.data;
}

export async function deleteReview(id: number): Promise<void> {
  await api.delete(`/reviews/${id}`);
}

// ── Comments ────────────────────────────────────────────

export async function listComments(candidateId: number): Promise<CommentRow[]> {
  const { data } = await api.get<{ data: CommentRow[] }>('/comments', {
    params: { candidateId },
  });
  return data.data;
}

export async function listCommentsBulk(candidateIds: number[]): Promise<CommentRow[]> {
  const { data } = await api.get<{ data: CommentRow[] }>('/comments', {
    params: { candidateIds: candidateIds.join(',') },
  });
  return data.data;
}

export async function createComment(body: CreateCommentBody): Promise<CommentRow> {
  const { data } = await api.post<{ data: CommentRow }>('/comments', body);
  return data.data;
}

export async function updateComment(id: number, text: string): Promise<CommentRow> {
  const { data } = await api.patch<{ data: CommentRow }>(`/comments/${id}`, { text });
  return data.data;
}

export async function deleteComment(id: number): Promise<void> {
  await api.delete(`/comments/${id}`);
}

// ── Dashboard ───────────────────────────────────────────

export async function getDashboard(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/dashboard');
  return data;
}

// ── Outbound Candidates ─────────────────────────────────

export async function listOutboundCandidates(params: { page?: number; limit?: number; status?: string }): Promise<OutboundCandidateListResponse> {
  const { data } = await api.get<OutboundCandidateListResponse>('/outbound-candidates', { params });
  return data;
}

export async function updateOutboundCandidateStatus(id: number, status: string): Promise<OutboundCandidateRow> {
  const { data } = await api.patch<{ data: OutboundCandidateRow }>(`/outbound-candidates/${id}`, { status });
  return data.data;
}
