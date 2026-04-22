import { useTranslation } from 'react-i18next';

import { usePageTitle } from 'src/hooks';

import { InstructorStudentsView } from 'src/sections/instructor/view';

// ----------------------------------------------------------------------

export default function InstructorStudentsPage() {
  const { t } = useTranslation();

  usePageTitle(t('instructor.students'));

  return <InstructorStudentsView />;
}
