import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

type AuthShowcaseProps = {
  eyebrow: string;
  title: string;
  description: string;
  highlights: Array<{ label: string; icon: string }>;
  metrics: Array<{ value: string; label: string }>;
};

export function AuthShowcase({
  eyebrow,
  title,
  description,
  highlights,
  metrics,
}: AuthShowcaseProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
        p: { xs: 3, md: 4 },
        mb: 3,
        color: 'common.white',
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 48%, #0f172a 100%)`,
        boxShadow: `0 24px 60px ${alpha(theme.palette.common.black, 0.28)}`,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at top right, ${alpha(theme.palette.common.white, 0.18)} 0%, transparent 42%),
                       radial-gradient(circle at bottom left, ${alpha(theme.palette.primary.light, 0.24)} 0%, transparent 36%)`,
        }}
      />

      <Stack spacing={2} sx={{ position: 'relative' }}>
        <Chip
          label={eyebrow}
          sx={{
            alignSelf: 'flex-start',
            bgcolor: alpha(theme.palette.common.white, 0.12),
            color: 'common.white',
            fontWeight: 700,
            borderRadius: 99,
          }}
        />

        <Box>
          <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.1, mb: 1 }}>
            {title}
          </Typography>
          <Typography variant="body1" sx={{ maxWidth: 640, color: alpha(theme.palette.common.white, 0.82) }}>
            {description}
          </Typography>
        </Box>

        <Stack direction="row" flexWrap="wrap" gap={1.25}>
          {highlights.map((item) => (
            <Chip
              key={item.label}
              icon={<Iconify icon={item.icon} width={18} />}
              label={item.label}
              sx={{
                bgcolor: alpha(theme.palette.common.white, 0.12),
                color: 'common.white',
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
          ))}
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          {metrics.map((metric) => (
            <Box
              key={metric.label}
              sx={{
                minWidth: 160,
                borderRadius: 3,
                p: 2,
                bgcolor: alpha(theme.palette.common.white, 0.08),
                border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {metric.value}
              </Typography>
              <Typography variant="body2" sx={{ color: alpha(theme.palette.common.white, 0.74) }}>
                {metric.label}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ pt: 1 }}>
          <Avatar sx={{ width: 42, height: 42, bgcolor: alpha(theme.palette.common.white, 0.16) }}>
            <Iconify icon="solar:shield-check-bold" width={22} />
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Secure account access
            </Typography>
            <Typography variant="caption" sx={{ color: alpha(theme.palette.common.white, 0.72) }}>
              Real backend validation, protected sessions, and clear recovery paths.
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}
