export type EngineerTopCourseDto = {
  courseId: number;
  courseTitle: string;
  applicationCount: number;
};

export type EngineerDashboardDto = {
  totalCourses: number;
  totalCourseRounds: number;
  totalAcceptedApplications: number;
  totalRejectedApplications: number;
  totalPendingApplications: number;
  topCourses: EngineerTopCourseDto[];
};
