import { usePageTitle } from 'src/hooks';

import { AdminApplicationsView } from 'src/sections/admin/view/admin-applications-view';

export default function EngineerApplicationsPage() {
  usePageTitle('Engineer Applications');

  return <AdminApplicationsView />;
}
