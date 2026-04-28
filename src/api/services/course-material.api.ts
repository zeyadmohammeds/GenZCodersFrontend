import type { AxiosResponse } from 'axios';

import http from '../http';

import type { MaterialDto } from '../models/material';

const unwrap = <T>(res: AxiosResponse<T>): T => res.data;

export interface CreateCourseMaterialRequest {
  courseRoundId: number;
  createdByAccountId: number;
  weekId?: number | null;
  parentMaterialId?: number | null;
  materialTypeStatusId?: number;
  title: string;
  description?: string;
  link?: string;
  meetingId?: string;
  meetingPassword?: string;
}

export interface UpdateCourseMaterialRequest {
  title?: string;
  description?: string;
  link?: string;
  materialTypeStatusId?: number;
  parentMaterialId?: number | null;
  isActive?: boolean;
}

export interface PatchCourseMaterialRequest {
  title?: string | null;
  description?: string | null;
  link?: string | null;
  statusId?: number | null;
  meetingId?: string | null;
  meetingPassword?: string | null;
}

export interface CreateZoomCourseMaterialRequest {
  courseRoundId: number;
  createdByAccountId: number;
  weekId?: number | null;
  title: string;
  description?: string;
  startTimeUtc: string;
  durationMinutes: number;
}

export interface ZoomSignatureResponse {
  signature: string;
  sdkKey?: string; // deprecated - no longer required for Meeting SDK Web join
}

export interface CreatePdfCourseMaterialRequest {
  courseRoundId: number;
  createdByAccountId: number;
  weekId?: number | null;
  parentMaterialId?: number | null;
  materialTypeStatusId?: number;
  title: string;
  description?: string;
  file: File;
}

export const courseMaterialApi = {
  getAll: async (courseRoundId?: number): Promise<MaterialDto[]> => {
    const params = courseRoundId != null ? { courseRoundId } : undefined;
    const res = await http.get<MaterialDto[]>('/api/CourseMaterial', { params });
    const items = unwrap(res);

    if (courseRoundId == null) return items;

    return items.filter((m) => Number(m.courseRoundId) === Number(courseRoundId));
  },

  getByCourseRoundId: async (courseRoundId: number): Promise<MaterialDto[]> => courseMaterialApi.getAll(courseRoundId),

  getById: async (id: number): Promise<MaterialDto> => {
    const res = await http.get<MaterialDto>(`/api/CourseMaterial/${id}`);
    return unwrap(res);
  },

  create: async (payload: CreateCourseMaterialRequest): Promise<MaterialDto> => {
    const res = await http.post<MaterialDto>('/api/CourseMaterial', payload);
    return unwrap(res);
  },

  update: async (id: number, payload: UpdateCourseMaterialRequest): Promise<MaterialDto> => {
    const res = await http.put<MaterialDto>(`/api/CourseMaterial/${id}`, payload);
    return unwrap(res);
  },

  createZoom: async (payload: CreateZoomCourseMaterialRequest): Promise<MaterialDto> => {
    const res = await http.post<MaterialDto>('/api/CourseMaterial/zoom', payload);
    return unwrap(res);
  },

  createPdf: async (payload: CreatePdfCourseMaterialRequest): Promise<MaterialDto> => {
    const formData = new FormData();
    formData.append('courseRoundId', String(payload.courseRoundId));
    formData.append('createdByAccountId', String(payload.createdByAccountId));
    if (payload.weekId != null) formData.append('weekId', String(payload.weekId));
    if (payload.parentMaterialId != null) formData.append('parentMaterialId', String(payload.parentMaterialId));
    if (payload.materialTypeStatusId != null) formData.append('materialTypeStatusId', String(payload.materialTypeStatusId));
    formData.append('title', payload.title);
    if (payload.description) formData.append('description', payload.description);
    formData.append('file', payload.file);

    const res = await http.post<MaterialDto>('/api/CourseMaterial/pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap(res);
  },

  patch: async (id: number, payload: PatchCourseMaterialRequest): Promise<void> => {
    await http.patch(`/api/CourseMaterial/${id}`, payload);
  },

  delete: async (id: number): Promise<void> => {
    await http.delete(`/api/CourseMaterial/${id}`);
  },
};

export const zoomApi = {
  getSdkAvailable: async (): Promise<{ sdkAvailable: boolean }> => {
    const res = await http.get<{ sdkAvailable: boolean }>('/api/Zoom/sdk-available');
    return unwrap(res);
  },

  getSignature: async (meetingNumber: string, role: 0 | 1): Promise<ZoomSignatureResponse> => {
    const res = await http.post<ZoomSignatureResponse>('/api/Zoom/signature', {
      meetingNumber,
      role,
    });
    return unwrap(res);
  },
};
