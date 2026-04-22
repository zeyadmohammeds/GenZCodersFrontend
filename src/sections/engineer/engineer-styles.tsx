import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { alpha, styled } from '@mui/material/styles';

// ----------------------------------------------------------------------

export const EngineeringFrame = styled(Card)(({ theme }) => ({
  position: 'relative',
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius * 2,
  background: alpha(theme.palette.background.paper, 0.6),
  backdropFilter: 'blur(20px)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
  transition: theme.transitions.create(['transform', 'box-shadow', 'border-color'], {
    duration: theme.transitions.duration.shorter,
  }),
  '&:hover': {
    borderColor: alpha(theme.palette.primary.main, 0.2),
    boxShadow: `0 12px 48px 0 ${alpha(theme.palette.primary.main, 0.15)}`,
  },
}));

export const PageHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius * 3,
  position: 'relative',
  overflow: 'hidden',
  color: theme.palette.common.white,
  background: `linear-gradient(135deg, ${theme.palette.grey[900]} 0%, ${theme.palette.primary.dark} 100%)`,
  boxShadow: `0 24px 48px -12px ${alpha(theme.palette.primary.main, 0.35)}`,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
  },
}));

export const MetricLabel = styled(Typography)(({ theme }) => ({
  ...theme.typography.overline,
  color: theme.palette.text.secondary,
  fontWeight: 700,
  letterSpacing: 1.2,
  marginBottom: theme.spacing(0.5),
}));

export const MetricValue = styled(Typography)(({ theme }) => ({
  ...theme.typography.h4,
  fontWeight: 900,
  color: theme.palette.text.primary,
}));

export const GlassCard = styled(Card)(({ theme }) => ({
  background: alpha(theme.palette.background.paper, 0.4),
  backdropFilter: 'blur(12px)',
  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  borderRadius: theme.shape.borderRadius * 2,
  padding: theme.spacing(2.5),
}));

export const GradientIcon = styled(Box)(({ theme }) => ({
  width: 48,
  height: 48,
  borderRadius: theme.shape.borderRadius * 1.5,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.2)} 100%)`,
  color: theme.palette.primary.main,
  boxShadow: `0 4px 12px 0 ${alpha(theme.palette.primary.main, 0.1)}`,
}));
