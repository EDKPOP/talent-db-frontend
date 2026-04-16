import axios from 'axios';
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
} from './types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Candidates ──────────────────────────────────────────

export async function listCandidates(params: ListQuery): Promise<CandidateListResponse> {
  const { data } = await api.get<CandidateListResponse>('/candidates', { params });
  return data;
}

export async function getCandidate(id: number): Promise<CandidateRow> {
  const { data } = await api.get<{ data: CandidateRow }>(`/candidates/${id}`);
  return data.data;
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

export async function listAllReviews(): Promise<ReviewRow[]> {
  const { data } = await api.get<{ data: ReviewRow[] }>('/reviews');
  return data.data;
}

export async function listReviewsBulk(candidateIds: number[]): Promise<ReviewRow[]> {
  const { data } = await api.get<{ data: ReviewRow[] }>('/reviews', {
    params: { candidateIds: candidateIds.join(',') },
  });
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
