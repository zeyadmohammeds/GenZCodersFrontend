import { usePageTitle } from 'src/hooks';

import { EngineerRoundsManagementView } from 'src/sections/engineer/view/engineer-rounds-management-view';

export default function EngineerRoundsPage() {
  usePageTitle('Engineer Rounds');

  return <EngineerRoundsManagementView />;
}
