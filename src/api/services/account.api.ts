import type { AxiosResponse } from 'axios';

import http from '../http';

export interface InstructorDto {
  id: number;
  fullName: string;
  email: string;
}

export type CoInstructorDto = InstructorDto;

const unwrap = <T>(res: AxiosResponse<T>): T => res.data;

export const accountApi = {
  getInstructors: async (): Promise<InstructorDto[]> => {
    const res = await http.get<InstructorDto[]>('/api/Instructors/co-instructors');
    return unwrap(res);
  },

  getCoInstructors: async (): Promise<CoInstructorDto[]> => {
    const res = await http.get<CoInstructorDto[]>('/api/Instructors/co-instructors');
    return unwrap(res);
  },
};
