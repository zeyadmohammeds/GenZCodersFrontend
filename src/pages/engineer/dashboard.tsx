import { usePageTitle } from 'src/hooks';

import { EngineerDashboardView } from 'src/sections/engineer/view/engineer-dashboard-view';

export default function EngineerDashboardPage() {
  usePageTitle('Engineer Dashboard');
  return <EngineerDashboardView />;
}
