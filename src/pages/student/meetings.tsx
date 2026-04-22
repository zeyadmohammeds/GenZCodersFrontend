import { useTranslation } from 'react-i18next';

import { usePageTitle } from 'src/hooks';

import { StudentMeetingsView } from 'src/sections/student/view';

// ----------------------------------------------------------------------

export default function StudentMeetingsPage() {
  const { t } = useTranslation();

  usePageTitle(t('student.meetings'));

  return <StudentMeetingsView />;
}
