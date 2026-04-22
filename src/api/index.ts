export * from './errors';
export { default as http } from './http';

export { authApi } from './services/auth.api';

export { weekApi } from './services/week.api';
export { adminApi } from './services/admin.api';
export { mediaApi } from './services/media.api';
export { courseApi } from './services/course.api';
export { accountApi } from './services/account.api';
export { materialApi } from './services/material.api';
export { applicationApi } from './services/application.api';
export { courseRoundApi } from './services/course-round.api';
export { engineerDashboardApi } from './services/engineer-dashboard.api';
export { zoomApi, courseMaterialApi } from './services/course-material.api';
export { courseRoundStudentApi } from './services/course-round-student.api';
export { courseRoundInstructorApi } from './services/course-round-instructor.api';

export type { DashboardData } from './services/admin.api';