import type { BoxProps } from '@mui/material/Box';

import { mergeClasses } from 'minimal-shared/utils';

import Box from '@mui/material/Box';

import { layoutClasses } from '../core/classes';

// ----------------------------------------------------------------------

export type AuthContentProps = BoxProps;

export function AuthContent({ sx, children, className, ...other }: AuthContentProps) {
  return (
    <Box
      className={mergeClasses([layoutClasses.content, className])}
      sx={[
        (theme) => ({
          py: 5,
          px: { xs: 0, md: 2 },
          width: 1,
          zIndex: 2,
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 'var(--layout-auth-content-width)',
          bgcolor: 'transparent',
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {children}
    </Box>
  );
}
