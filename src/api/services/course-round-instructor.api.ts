import type { AxiosResponse } from 'axios';

import http from '../http';

import type {
  AssignInstructorsRequest,
  InstructorCourseRoundDto,
  AssignInstructorsResponse,
} from '../models/course-round-instructor';

// Define instructor details interface
export interface CourseRoundInstructorDetails {
  instructorId: number;
  instructorName: string;
  instructorEmail: string;
  courseRoundId: number;
  courseName: string;
  roundNumber: number;
  startDate: string;
  endDate: string;
  price: number;
}

const unwrap = <T>(res: AxiosResponse<T>): T => res.data;

export const courseRoundInstructorApi = {
  assignInstructors: async (payload: AssignInstructorsRequest): Promise<AssignInstructorsResponse> => {
    const res = await http.post<AssignInstructorsResponse>('/api/course-round-instructors/assign', payload);
    return unwrap(res);
  },

  getByInstructorId: async (instructorId: number): Promise<InstructorCourseRoundDto[]> => {
    const res = await http.get<InstructorCourseRoundDto[]>(
      `/api/course-round-instructors/instructor/${instructorId}`
    );
    return unwrap(res);
  },

  getByCourseRoundId: async (courseRoundId: number): Promise<InstructorCourseRoundDto[]> => {
    const res = await http.get<InstructorCourseRoundDto[]>(
      `/api/course-round-instructors/round/${courseRoundId}`
    );
    return unwrap(res);
  },

  getInstructorsByCourseRoundId: async (courseRoundId: number): Promise<CourseRoundInstructorDetails[]> => {
    const res = await http.get<CourseRoundInstructorDetails[]>(
      `/api/course-round-instructors/round/${courseRoundId}/instructors`
    );
    return unwrap(res);
  },
};
