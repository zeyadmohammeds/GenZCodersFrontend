import { CONFIG } from 'src/config-global';

import { NotFoundView } from 'src/sections/courses/error';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`404 page not found! | Error - ${CONFIG.appName}`}</title>

      <NotFoundView />
    </>
  );
}
