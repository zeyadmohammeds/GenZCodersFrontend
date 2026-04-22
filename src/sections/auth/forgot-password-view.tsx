import { motion } from 'motion/react';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { authApi } from 'src/api';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function ForgotPasswordView() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  const brandGradient = `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email format');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await authApi.forgotPassword({ email });
      setSuccess(true);
    } catch (err) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        x: isShaking ? [0, -10, 10, -10, 10, 0] : 0,
      }}
      transition={{
        duration: isShaking ? 0.4 : 0.6,
        type: 'spring',
        bounce: 0.3,
      }}
      style={{
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <Card
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(16px)',
          boxShadow: `0 24px 48px ${alpha(theme.palette.common.black, 0.08)}`,
        }}
      >
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
              {t('auth.forgotPassword') || 'Forgot password'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('auth.forgotPasswordDescription') || 'Enter your email to reset your password.'}
            </Typography>
          </Box>

          {success ? (
            <Stack spacing={3}>
              <Alert severity="success" sx={{ borderRadius: 1.5 }}>
                {t('auth.passwordResetEmailSent') || 'Reset link sent! Check your inbox.'}
              </Alert>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                onClick={() => router.push('/sign-in')}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                {t('auth.backToSignIn')}
              </Button>
            </Stack>
          ) : (
            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <Stack spacing={2.5}>
                {error && (
                  <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: 1.5 }}>
                    {error}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  name="email"
                  label={t('auth.email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                  slotProps={{
                    inputLabel: { shrink: true },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Iconify icon="solar:letter-bold" width={20} sx={{ mr: 0.5, color: 'text.disabled' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Button
                  fullWidth
                  size="large"
                  type="submit"
                  variant="contained"
                  disabled={loading || !email.trim()}
                  sx={{
                    py: 1.5,
                    fontWeight: 700,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  }}
                >
                  {loading ? t('auth.sending') : t('auth.sendResetLink')}
                </Button>

                <Typography variant="body2" align="center" sx={{ color: 'text.secondary' }}>
                  {t('auth.rememberPassword')}{' '}
                  <Link component={RouterLink} href="/sign-in" sx={{ fontWeight: 700, textDecoration: 'none' }}>
                    {t('auth.signIn')}
                  </Link>
                </Typography>
              </Stack>
            </Box>
          )}
        </Stack>
      </Card>
    </motion.div>
  );
}
