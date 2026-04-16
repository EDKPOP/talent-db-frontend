// Backend type definitions — mirrors the API server types exactly

export interface CandidateRow {
  id: number;
  airtableId: string | null;
  username: string | null;
  profileLink: string | null;
  fullname: string | null;
  introducing: string | null;
  birthday: number | null;
  followerCount: number | null;
  postCount: number | null;
  bestLikeCount: number | null;
  bestPostLink: string | null;
  usedHashtags: string[] | null;
  aiComment: string | null;
  performanceType: '댄스' | '보컬' | '댄스/보컬' | '불명확' | '모델' | null;
  skillEvaluation: '상' | '중' | '하' | '확인 필요' | '데이터 제한으로 중립 평가' | null;
  isPassed: '합격' | '불합격' | '검토 필요' | '미검토' | null;
  reviewer: string | null;
  reviewDate: string | null;
  contactStatus: '미연락' | 'DM 발송' | '답변 완료' | '진행 중' | '거절' | null;
  profileImageUrl: string | null;
  sampleImageUrls: string[] | null;
  bestPostImageUrl: string | null;
  sampleVideos: string[] | null;
  bestPostFileUrl: string | null;
  gender: '남성' | '여성' | '미확인' | '불명확' | null;
  heightCm: number | null;
  weightKg: number | null;
  bodyRecordDate: string | null;
  contact: string | null;
  contactType: '본인' | '어머니' | '아버지' | '기타' | null;
  reviewStatus: '합격' | '보류' | '미검토' | '불합격' | '부적절' | null;
  reviewComment: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface CandidateWithExtras extends CandidateRow {
  latestComment: CommentSummary | null;
  myReviewStatus?: string | null;
}

export interface CommentSummary {
  id: number;
  candidateId: number;
  text: string | null;
  type: string | null;
  reviewerId: string | null;
  reviewerName: string | null;
  createdAt: string | null;
}

export interface PatchCandidateBody {
  username?: string;
  fullname?: string;
  introducing?: string;
  birthday?: number;
  followerCount?: number;
  postCount?: number;
  bestLikeCount?: number;
  bestPostLink?: string;
  usedHashtags?: string[];
  aiComment?: string;
  performanceType?: string;
  skillEvaluation?: string;
  isPassed?: string;
  reviewer?: string;
  reviewDate?: string;
  contactStatus?: string;
  profileImageUrl?: string;
  sampleImageUrls?: string[];
  bestPostImageUrl?: string;
  sampleVideos?: string[];
  bestPostFileUrl?: string;
  gender?: string;
  heightCm?: number;
  weightKg?: number;
  bodyRecordDate?: string;
  contact?: string;
  contactType?: string;
  reviewStatus?: string;
  reviewComment?: string;
  profileLink?: string;
}

export interface CreateCandidateBody extends PatchCandidateBody {
  username: string;
}

export interface BulkPatchBody {
  ids: number[];
  updates: PatchCandidateBody;
}

export interface ListQuery {
  reviewStatus?: string;
  reviewStatuses?: string | string[];
  gender?: string;
  genders?: string | string[];
  performanceType?: string;
  performanceTypes?: string | string[];
  birthYears?: string | string[];
  includeUnknownBirthYear?: string;
  search?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface CandidateListResponse {
  data: CandidateWithExtras[];
  total: number;
  page: number;
  limit: number;
  counts: {
    전체: number;
    합격: number;
    보류: number;
    불합격: number;
    미검토: number;
  };
}

export interface ReviewRow {
  id: number;
  airtableId?: string;
  candidateId: number;
  status: string;
  reviewerId?: string;
  reviewerName?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface CreateReviewBody {
  candidateId: number;
  status: '합격' | '불합격' | '검토 필요' | '보류';
  reviewerId: string;
  reviewerName?: string;
}

export interface CommentRow {
  id: number;
  airtableId?: string;
  candidateId: number;
  text?: string;
  type?: string;
  reviewerId?: string;
  reviewerName?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface CreateCommentBody {
  candidateId: number;
  text: string;
  type?: string;
  reviewerId: string;
  reviewerName?: string;
}

export interface DashboardStats {
  total_rows: number;
  today_added: number;
  queue_size: number;
  hashtag_1_seen: number;
  hashtag_2_seen: number;
  hashtag_3_seen: number;
  estimated_days: number;
  scraper_status: 'RUNNING' | 'IDLE';
  updated_at: string | null;
}
