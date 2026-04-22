export interface CourseRoundDto {
  id: number;
  roundNumber: number;
  startDate: string; // DateOnly format: YYYY-MM-DD
  endDate: string; // DateOnly format: YYYY-MM-DD
  minStudents?: number | null;
  maxStudents?: number | null;
  price?: number | null;
  courseId: number;
  courseName?: string;
  statusId?: number;
  status?: string;
  courseRoundGroupId?: number | null;
  groups?: CourseRoundGroupItemDto[];
  question1?: string | null;
  question2?: string | null;
  question3?: string | null;
  question4?: string | null;
  question5?: string | null;
  question6?: string | null;
  question7?: string | null;
  question8?: string | null;
  question9?: string | null;
  question10?: string | null;
  createdAt?: string;
  mainInstructorId?: number;
  instructorId?: number;
  instructorName?: string;
  InstructorId?: number;
  instructor?: string;
  Instructor?: string;
  weekTitles?: string[];
}

export interface CourseRoundGroupItemDto {
  id: number;
  roundNumber: number;
  startDate?: string;
  endDate?: string;
  price?: number | null;
}

export interface CourseRoundDetailsDto {
  id: number;
  roundNumber: number;
  courseName: string;
  courseId?: number | null;
  startDate?: string;
  endDate?: string;
  price?: number | null;
  courseRoundGroupId?: number | null;
  minStudents?: number | null;
  maxStudents?: number | null;
  statusId?: number;
  instructorId?: number | null;
  groups?: CourseRoundGroupItemDto[];
  weekTitles?: string[];
  instructorName?: string;
  question1?: string | null;
  question2?: string | null;
  question3?: string | null;
  question4?: string | null;
  question5?: string | null;
  question6?: string | null;
  question7?: string | null;
  question8?: string | null;
  question9?: string | null;
  question10?: string | null;
  automatedWorkFlowJump?: number | null;
}

export interface CreateCourseRoundRequest {
  courseId: number;
  roundNumber: number;
  startDate: string; // DateOnly format: YYYY-MM-DD
  endDate: string; // DateOnly format: YYYY-MM-DD
  minStudents?: number | null;
  maxStudents?: number | null;
  price?: number | null;
  courseRoundGroupId?: number | null;
  question1?: string | null;
  question2?: string | null;
  question3?: string | null;
  question4?: string | null;
  question5?: string | null;
  question6?: string | null;
  question7?: string | null;
  question8?: string | null;
  question9?: string | null;
  question10?: string | null;
  automatedWorkFlowJump?: number | null;
}

export interface UpdateCourseRoundRequest {
  courseId?: number | null;
  roundNumber: number;
  startDate?: string; // DateOnly format: YYYY-MM-DD
  endDate?: string; // DateOnly format: YYYY-MM-DD
  minStudents?: number | null;
  maxStudents?: number | null;
  price?: number | null;
  courseRoundGroupId?: number | null;
  statusId: number;
  question1?: string | null;
  question2?: string | null;
  question3?: string | null;
  question4?: string | null;
  question5?: string | null;
  question6?: string | null;
  question7?: string | null;
  question8?: string | null;
  question9?: string | null;
  question10?: string | null;
}

export interface PatchCourseRoundRequest {
  courseId?: number | null;
  roundNumber?: number | null;
  startDate?: string;
  endDate?: string;
  minStudents?: number | null;
  maxStudents?: number | null;
  price?: number | null;
  statusId?: number | null;
  courseRoundGroupId?: number | null;
  question1?: string | null;
  question2?: string | null;
  question3?: string | null;
  question4?: string | null;
  question5?: string | null;
  question6?: string | null;
  question7?: string | null;
  question8?: string | null;
  question9?: string | null;
  question10?: string | null;
}
