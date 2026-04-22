export interface InstructorCourseRoundDto {
  instructorId?: number;
  courseRoundId: number;
  courseName: string;
  roundNumber: number;
  startDate: string;
  endDate: string;
  price: number;
}

export interface AssignInstructorsRequest {
  courseRoundId: number;
  instructorIds: number[];
}

export interface AssignInstructorsResponse {
  message: string;
}
