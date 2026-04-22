import type { AxiosResponse } from 'axios';

import http from '../http';

import type { MediaDto, MediaCreateRequest } from '../models/media';

const unwrap = <T>(res: AxiosResponse<T>): T => res.data;

export interface UploadResult {
  url: string;
  filePath: string;
}

export const mediaApi = {
  upload: async (file: File, folder = 'payment_proofs'): Promise<UploadResult> => {
    const form = new FormData();
    form.append('file', file);
    const res = await http.post<UploadResult>('/api/medias/upload', form, {
      params: { folder },
      timeout: 60000,
    });
    return unwrap(res);
  },

  create: async (payload: MediaCreateRequest): Promise<unknown> => {
    const res = await http.post<unknown>('/api/medias', payload);
    return unwrap(res);
  },

  getByTable: async (params: { tableName: string; tableId: number }): Promise<unknown> => {
    const res = await http.get<unknown>('/api/medias', { params });
    return unwrap(res);
  },

  delete: async (id: number): Promise<unknown> => {
    const res = await http.delete<unknown>(`/api/medias/${id}`);
    return unwrap(res);
  },
  normalizeMany: (value: unknown): MediaDto[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value as MediaDto[];

    if (typeof value === 'object') {
      const asObj = value as Record<string, unknown>;
      const data = asObj.data;
      if (Array.isArray(data)) return data as MediaDto[];

      const items = asObj.items;
      if (Array.isArray(items)) return items as MediaDto[];

      const result = asObj.result;
      if (Array.isArray(result)) return result as MediaDto[];

      const single = asObj.media;
      if (single && typeof single === 'object') return [single as MediaDto];
    }

    return [];
  },
};
