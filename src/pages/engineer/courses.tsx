import { usePageTitle } from 'src/hooks';

import { EngineerCourseManagementView } from 'src/sections/engineer/view/engineer-course-management-view';

export default function EngineerCoursesPage() {
  usePageTitle('Engineer Courses');

  return <EngineerCourseManagementView />;
}
