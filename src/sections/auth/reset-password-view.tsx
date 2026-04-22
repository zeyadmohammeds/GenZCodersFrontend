import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { validatePassword } from 'src/utils/password-strength';

import { authApi } from 'src/api';

import { Iconify } from 'src/components/iconify';
import { PasswordStrengthIndicator } from 'src/components/password-strength-indicator';

// ----------------------------------------------------------------------

export function ResetPasswordView() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const brandGradient = `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`;

  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(
    validatePassword('')
  );

  // Extract token and email from URL query params
  useEffect(() => {
    const urlToken = searchParams.get('token');
    const urlEmail = searchParams.get('email');
    if (urlToken) setToken(urlToken);
    if (urlEmail) setEmail(decodeURIComponent(urlEmail));
  }, [searchParams]);

  const handlePasswordChange = useCallback((newPassword: string) => {
    setPassword(newPassword);
    setPasswordStrength(validatePassword(newPassword));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!token.trim()) {
      setError('Reset token is required');
      return;
    }

    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    if (!passwordStrength.isValid) {
      setError('Please enter a stronger password');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authApi.resetPassword({
        email,
        token,
        newPassword: password,
      });
      setSuccess(true);
      // Redirect to sign-in after 3 seconds
      setTimeout(() => {
        router.push('/sign-in');
      }, 3000);
    } catch (err) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [email, token, password, confirmPassword, passwordStrength, router]);

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
              {success ? 'Reset Successful!' : 'Reset Password'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {success
                ? 'Your password has been updated. Redirecting to sign in...'
                : 'Enter your new password below.'}
            </Typography>
          </Box>

          {success ? (
            <Stack spacing={3}>
              <Alert severity="success" sx={{ borderRadius: 1.5 }}>
                Your password has been reset successfully!
              </Alert>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                onClick={() => router.push('/sign-in')}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                Go to Sign In
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
                  disabled
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

                {!searchParams.get('token') && (
                  <TextField
                    fullWidth
                    name="token"
                    label="Reset Token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter token from email"
                    slotProps={{
                      inputLabel: { shrink: true },
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Iconify icon="solar:key-minimalistic-bold" width={20} sx={{ mr: 0.5, color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                )}

                <Box>
                  <TextField
                    fullWidth
                    name="password"
                    label="New Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="••••••••"
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
                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                              <Iconify icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} width={20} />
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                  {password && <PasswordStrengthIndicator strength={passwordStrength} />}
                </Box>

                <TextField
                  fullWidth
                  name="confirmPassword"
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
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
                          <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                            <Iconify icon={showConfirmPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} width={20} />
                          </IconButton>
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
                  disabled={loading || !passwordStrength.isValid || password !== confirmPassword}
                  sx={{
                    py: 1.5,
                    fontWeight: 700,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  }}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </Button>

                <Typography variant="body2" align="center" sx={{ color: 'text.secondary' }}>
                  <Link component={RouterLink} href="/sign-in" sx={{ fontWeight: 700, textDecoration: 'none' }}>
                    {t('auth.backToSignIn')}
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
