import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
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

  // Load remembered email
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('remember_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setTrustedDevice(true);
    }
  }, []);

  const clearField = useCallback((field: keyof FieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setError('');
  }, []);

  const applyCredentialError = useCallback((message: string) => {
    setError(message);
    setFieldErrors({
      email: 'Check your email and try again.',
      password: 'Check your password and try again.',
    });
  }, []);

  const handleGoogleError = useCallback((err: Error) => {
    setGoogleLoading(false);
    setError(err.message || 'Google authentication failed.');
  }, []);

  const handleGoogleCallback = useCallback(
    async (credential: string) => {
      try {
        setGoogleLoading(true);
        setError('');
        const user = await loginWithGoogle(credential, trustedDevice);
        router.push(getPostAuthPath(user.role));
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Google authentication failed.');
        }
      } finally {
        setGoogleLoading(false);
      }
    },
    [loginWithGoogle, router]
  );

  const { signInWithGoogle, isGoogleLoaded } = useGoogleAuth(handleGoogleCallback, handleGoogleError);

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
      if (err instanceof Error) {
        setError(err.message);
      }
    }
  }, [isGoogleLoaded, signInWithGoogle]);

  const handleSignIn = useCallback(async () => {
    const nextFieldErrors: FieldErrors = {};

    if (!email.trim()) nextFieldErrors.email = 'Email is required.';
    if (!password) nextFieldErrors.password = 'Password is required.';

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError('Please enter your email and password.');
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
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      if (err instanceof ValidationError) {
        const next: FieldErrors = {};
        Object.entries(err.errors).forEach(([key, values]) => {
          const message = values?.[0];
          if (key.toLowerCase().includes('email')) next.email = message;
          if (key.toLowerCase().includes('password')) next.password = message;
        });
        setFieldErrors(next);
        setError(err.message);
      } else if (err instanceof ApiError) {
        if (err.status === 401) {
          applyCredentialError(err.message || t('auth.invalidCredentials') || 'Invalid email or password.');
        } else if (err.status === 0) {
          setError('Unable to connect to the server. Please ensure the backend is running.');
        } else {
          setError(err.message || 'An error occurred. Please try again.');
        }
      } else if (err instanceof Error) {
        setError(err.message || 'An error occurred. Please try again.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [applyCredentialError, email, login, password, router, t, trustedDevice]);

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
              {t('auth.signIn')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Welcome back! Please enter your details.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: 1.5 }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSignIn();
            }}
          >
            <Stack spacing={2.5}>
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
                error={Boolean(fieldErrors.email)}
                helperText={fieldErrors.email}
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
                error={Boolean(fieldErrors.password)}
                helperText={fieldErrors.password}
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Iconify icon="solar:lock-password-bold" width={20} sx={{ mr: 0.5, color: 'text.disabled' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                          <Iconify icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} width={20} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: -1 }}>
                <FormControlLabel
                  control={<Checkbox checked={trustedDevice} onChange={(e) => setTrustedDevice(e.target.checked)} />}
                  label={t('auth.rememberMe') || 'Remember me'}
                  sx={{ '& .MuiTypography-root': { fontSize: 14, fontWeight: 600, color: 'text.secondary' } }}
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
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                }}
              >
                {loading ? t('auth.signingIn') : t('auth.signIn')}
              </Button>

              <Divider>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                  OR
                </Typography>
              </Divider>

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
                  borderColor: alpha(theme.palette.grey[500], 0.2),
                }}
              >
                Google
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" align="center" sx={{ color: 'text.secondary' }}>
            Don’t have an account?{' '}
            <Link component={RouterLink} href="/sign-up" sx={{ fontWeight: 700, textDecoration: 'none' }}>
              Get started
            </Link>
          </Typography>
        </Stack>
      </Card>
    </motion.div>
  );
}
