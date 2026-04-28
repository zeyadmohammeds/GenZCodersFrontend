import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useGoogleAuth } from 'src/hooks/use-google-auth';

import { ApiError, ValidationError } from 'src/api/errors';
import { useAuth } from 'src/contexts/simple-auth-context';

import { Iconify } from 'src/components/iconify';

// ─────────────────────────────────────────────────────────────────────────────

type FieldErrors = {
  email?: string;
  password?: string;
};

const getPostAuthPath = (role: string) => {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'engineer') return '/engineer/dashboard';
  if (role === 'instructor') return '/instructor/courses';
  return '/dashboard';
};

// ─────────────────────────────────────────────────────────────────────────────

export function SignInView() {
  const router = useRouter();
  const theme = useTheme();
  const { login, loginWithGoogle } = useAuth();
  const { t } = useTranslation();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [trustedDevice, setTrustedDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isShaking, setIsShaking] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  // Load remembered email
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('remember_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setTrustedDevice(true);
    }
  }, []);

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setAttemptCount((c) => c + 1);
    setTimeout(() => setIsShaking(false), 600);
  }, []);

  const clearField = useCallback((field: keyof FieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    if (!Object.values({ ...fieldErrors, [field]: undefined }).some(Boolean)) {
      setError('');
    }
  }, [fieldErrors]);

  const applyCredentialError = useCallback(
    (message: string) => {
      setError(message);
      setFieldErrors({
        email: 'Check your email address.',
        password: 'Check your password.',
      });
      triggerShake();
    },
    [triggerShake]
  );

  // ── Google Auth ─────────────────────────────────────────────────────────────

  const handleGoogleError = useCallback((err: Error) => {
    setGoogleLoading(false);
    setError(err.message || 'Google authentication failed.');
    triggerShake();
  }, [triggerShake]);

  const handleGoogleCallback = useCallback(
    async (credential: string) => {
      try {
        setGoogleLoading(true);
        setError('');
        const user = await loginWithGoogle(credential, trustedDevice);
        router.push(getPostAuthPath(user.role));
      } catch (err) {
        triggerShake();
        setError(err instanceof Error ? err.message : 'Google authentication failed.');
      } finally {
        setGoogleLoading(false);
      }
    },
    [loginWithGoogle, router, trustedDevice, triggerShake]
  );

  const { signInWithGoogle, isGoogleLoaded } = useGoogleAuth(
    handleGoogleCallback,
    handleGoogleError
  );

  const handleGoogleSignIn = useCallback(async () => {
    if (!isGoogleLoaded) {
      setError('Google authentication is still loading. Please try again in a moment.');
      return;
    }
    setGoogleLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setGoogleLoading(false);
      if (err instanceof Error) setError(err.message);
    }
  }, [isGoogleLoaded, signInWithGoogle]);

  // ── Sign In ─────────────────────────────────────────────────────────────────

  const handleSignIn = useCallback(async () => {
    // Client-side validation
    const nextFieldErrors: FieldErrors = {};
    if (!email.trim()) nextFieldErrors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      nextFieldErrors.email = 'Enter a valid email address.';
    if (!password) nextFieldErrors.password = 'Password is required.';

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError('Please fix the highlighted fields before continuing.');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');
    setFieldErrors({});

    try {
      const user = await login(email, password, trustedDevice);

      if (trustedDevice) {
        localStorage.setItem('remember_email', email);
      } else {
        localStorage.removeItem('remember_email');
      }

      router.push(getPostAuthPath(user.role));
    } catch (err) {
      // ❌ NO window.location.reload() — form state is preserved intentionally

      if (err instanceof ValidationError) {
        const next: FieldErrors = {};
        Object.entries(err.errors).forEach(([key, values]) => {
          const msg = values?.[0];
          if (key.toLowerCase().includes('email')) next.email = msg;
          if (key.toLowerCase().includes('password')) next.password = msg;
        });
        setFieldErrors(next);
        setError(err.message || 'Please review your input and try again.');
        triggerShake();
      } else if (err instanceof ApiError) {
        if (err.status === 401) {
          // Show the exact message from the backend API (e.g. "Invalid email or password.")
          const apiMessage = err.message || 'Invalid email or password. Please try again.';
          applyCredentialError(apiMessage);
        } else if (err.status === 423) {
          setError('Your account is temporarily locked. Please try again later or reset your password.');
          triggerShake();
        } else if (err.status === 429) {
          setError('Too many login attempts. Please wait a moment and try again.');
          triggerShake();
        } else if (err.status === 0) {
          setError('Cannot reach the server. Please check your connection and try again.');
          triggerShake();
        } else {
          setError(err.message || 'An unexpected error occurred. Please try again.');
          triggerShake();
        }
      } else if (err instanceof Error) {
        setError(err.message || 'An unexpected error occurred. Please try again.');
        triggerShake();
      } else {
        setError('An unexpected error occurred. Please try again.');
        triggerShake();
      }
    } finally {
      setLoading(false);
    }
  }, [applyCredentialError, email, login, password, router, t, triggerShake, trustedDevice]);

  // ── Render ──────────────────────────────────────────────────────────────────

  const isDark = theme.palette.mode === 'dark';

  return (
    <motion.div
      key="sign-in-card"
      initial={{ opacity: 0, y: 24 }}
      animate={{
        opacity: 1,
        y: 0,
        x: isShaking ? [0, -12, 12, -8, 8, -4, 4, 0] : 0,
      }}
      transition={{
        opacity: { duration: 0.5 },
        y: { duration: 0.5, type: 'spring', bounce: 0.3 },
        x: { duration: 0.5, type: 'tween', ease: 'easeInOut' },
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
          border: `1px solid ${alpha(
            error ? theme.palette.error.main : theme.palette.divider,
            error ? 0.3 : 0.1
          )}`,
          bgcolor: alpha(theme.palette.background.paper, 0.92),
          backdropFilter: 'blur(20px)',
          boxShadow: error
            ? `0 24px 48px ${alpha(theme.palette.error.main, 0.08)}, 0 0 0 1px ${alpha(theme.palette.error.main, 0.12)}`
            : `0 24px 48px ${alpha(theme.palette.common.black, 0.08)}`,
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        <Stack spacing={3}>
          {/* Header */}
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
              {t('auth.signIn')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Welcome back! Please enter your details.
            </Typography>
          </Box>

          {/* ── Animated Error Banner ─────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key={`error-${attemptCount}`}
                initial={{ opacity: 0, y: -12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.28, type: 'spring', bounce: 0.25 }}
              >
                <Alert
                  severity="error"
                  onClose={() => {
                    setError('');
                    setFieldErrors({});
                  }}
                  icon={
                    <Iconify
                      icon="solar:danger-triangle-bold"
                      width={20}
                      sx={{ mt: 0.15 }}
                    />
                  }
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`,
                    bgcolor: alpha(
                      theme.palette.error.main,
                      isDark ? 0.12 : 0.06
                    ),
                    color: 'error.dark',
                    fontWeight: 500,
                    '& .MuiAlert-message': {
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                    },
                    '& .MuiAlert-icon': {
                      color: 'error.main',
                    },
                  }}
                >
                  {error}
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Form ─────────────────────────────────────────────────────── */}
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSignIn();
            }}
          >
            <Stack spacing={2.5}>
              {/* Email */}
              <TextField
                fullWidth
                name="email"
                label={t('auth.email')}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearField('email');
                }}
                placeholder="you@example.com"
                autoComplete="email"
                error={Boolean(fieldErrors.email)}
                helperText={fieldErrors.email}
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Iconify
                          icon={
                            fieldErrors.email
                              ? 'solar:letter-bold'
                              : 'solar:letter-bold'
                          }
                          width={20}
                          sx={{
                            mr: 0.5,
                            color: fieldErrors.email ? 'error.main' : 'text.disabled',
                            transition: 'color 0.2s',
                          }}
                        />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'box-shadow 0.2s ease',
                    '&:hover:not(.Mui-error)': {
                      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.08)}`,
                    },
                    '&.Mui-focused:not(.Mui-error)': {
                      boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.12)}`,
                    },
                    '&.Mui-error': {
                      '& fieldset': { borderWidth: 2 },
                    },
                  },
                  '& .MuiFormHelperText-root': {
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  },
                }}
              />

              {/* Password */}
              <TextField
                fullWidth
                name="password"
                label={t('auth.password')}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearField('password');
                }}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                error={Boolean(fieldErrors.password)}
                helperText={fieldErrors.password}
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Iconify
                          icon="solar:lock-password-bold"
                          width={20}
                          sx={{
                            mr: 0.5,
                            color: fieldErrors.password ? 'error.main' : 'text.disabled',
                            transition: 'color 0.2s',
                          }}
                        />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end"
                          size="small"
                          tabIndex={-1}
                        >
                          <Iconify
                            icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                            width={20}
                          />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'box-shadow 0.2s ease',
                    '&:hover:not(.Mui-error)': {
                      boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.08)}`,
                    },
                    '&.Mui-focused:not(.Mui-error)': {
                      boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.12)}`,
                    },
                    '&.Mui-error': {
                      '& fieldset': { borderWidth: 2 },
                    },
                  },
                  '& .MuiFormHelperText-root': {
                    fontWeight: 500,
                  },
                }}
              />

              {/* Remember Me + Forgot Password */}
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mt: -1 }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={trustedDevice}
                      onChange={(e) => setTrustedDevice(e.target.checked)}
                      size="small"
                    />
                  }
                  label={t('auth.rememberMe') || 'Remember me'}
                  sx={{
                    '& .MuiTypography-root': {
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'text.secondary',
                    },
                  }}
                />
                <Link
                  component={RouterLink}
                  href="/forgot-password"
                  variant="body2"
                  sx={{ fontWeight: 700, textDecoration: 'none' }}
                >
                  {t('auth.forgotPassword')}
                </Link>
              </Stack>

              {/* Submit */}
              <Button
                fullWidth
                size="large"
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  py: 1.5,
                  fontWeight: 700,
                  borderRadius: 2,
                  fontSize: '0.9375rem',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
                  transition: 'box-shadow 0.25s ease, transform 0.15s ease',
                  '&:hover': {
                    boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.4)}`,
                    transform: 'translateY(-1px)',
                  },
                  '&:active': { transform: 'translateY(0)' },
                  '&.Mui-disabled': { opacity: 0.65 },
                }}
              >
                {loading ? (
                  <Stack direction="row" alignItems="center" gap={1}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    >
                      <Iconify icon="solar:refresh-bold" width={18} />
                    </motion.div>
                    {t('auth.signingIn')}
                  </Stack>
                ) : (
                  t('auth.signIn')
                )}
              </Button>

              <Divider>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, px: 1 }}>
                  OR
                </Typography>
              </Divider>

              {/* Google */}
              <Button
                fullWidth
                variant="outlined"
                size="large"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
                startIcon={<Iconify width={20} icon="logos:google-icon" />}
                sx={{
                  py: 1.45,
                  fontWeight: 600,
                  borderRadius: 2,
                  borderColor: alpha(theme.palette.grey[500], 0.25),
                  transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s',
                  '&:hover': {
                    borderColor: alpha(theme.palette.grey[500], 0.5),
                    boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, 0.06)}`,
                    transform: 'translateY(-1px)',
                  },
                  '&:active': { transform: 'translateY(0)' },
                }}
              >
                {googleLoading ? 'Connecting…' : 'Continue with Google'}
              </Button>
            </Stack>
          </Box>

          {/* Footer */}
          <Typography variant="body2" align="center" sx={{ color: 'text.secondary' }}>
            Don&apos;t have an account?{' '}
            <Link
              component={RouterLink}
              href="/sign-up"
              sx={{ fontWeight: 700, textDecoration: 'none' }}
            >
              Get started
            </Link>
          </Typography>
        </Stack>
      </Card>
    </motion.div>
  );
}
