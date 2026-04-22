import { useTranslation } from 'react-i18next';

import { usePageTitle } from 'src/hooks';

import { InstructorRoundsView } from 'src/sections/instructor/view';

// ----------------------------------------------------------------------

export default function InstructorRoundsPage() {
  const { t } = useTranslation();

  usePageTitle(t('instructor.myRounds'));

  return <InstructorRoundsView />;
}
