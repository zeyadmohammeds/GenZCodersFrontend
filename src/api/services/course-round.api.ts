import type { AxiosResponse } from 'axios';

import http from '../http';

import type {
  CourseRoundDto,
  CourseRoundDetailsDto,
  PatchCourseRoundRequest,
  CreateCourseRoundRequest,
  UpdateCourseRoundRequest,
} from '../models/course-round';

const unwrap = <T>(res: AxiosResponse<T>): T => res.data;

export const courseRoundApi = {
  getAll: async (): Promise<CourseRoundDto[]> => {
    const res = await http.get<CourseRoundDto[]>('/api/CourseRound');
    return unwrap(res);
  },

  getById: async (id: number): Promise<CourseRoundDetailsDto> => {
    const res = await http.get<CourseRoundDetailsDto>(`/api/CourseRound/${id}`);
    return unwrap(res);
  },

  create: async (payload: CreateCourseRoundRequest): Promise<CourseRoundDetailsDto> => {
    const res = await http.post<CourseRoundDetailsDto>('/api/CourseRound', payload);
    return unwrap(res);
  },

  update: async (id: number, payload: UpdateCourseRoundRequest): Promise<void> => {
    await http.put(`/api/CourseRound/${id}`, payload, {
      validateStatus: (status: number) => (status >= 200 && status < 300) || status === 204,
    });
  },

  patch: async (id: number, payload: PatchCourseRoundRequest): Promise<void> => {
    await http.patch(`/api/CourseRound/${id}`, payload, {
      validateStatus: (status: number) => (status >= 200 && status < 300) || status === 204,
    });
  },

  delete: async (id: number): Promise<void> => {
    await http.delete(`/api/CourseRound/${id}`, {
      validateStatus: (status: number) => (status >= 200 && status < 300) || status === 204,
    });
  },
};
