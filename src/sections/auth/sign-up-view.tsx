import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import { alpha, useTheme } from '@mui/material/styles';
import InputAdornment from '@mui/material/InputAdornment';
import FormHelperText from '@mui/material/FormHelperText';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { validatePassword } from 'src/utils/password-strength';

import { ApiError, ValidationError } from 'src/api/errors';
import { useAuth } from 'src/contexts/simple-auth-context';

import { Iconify } from 'src/components/iconify';
import { PasswordStrengthIndicator } from 'src/components/password-strength-indicator';

// ─────────────────────────────────────────────────────────────────────────────

type SignUpFieldErrors = Partial<
  Record<
    | 'fullNameEn'
    | 'fullNameAr'
    | 'nationalId'
    | 'phone'
    | 'email'
    | 'password'
    | 'confirmPassword'
    | 'educationalLevelId',
    string
  >
>;

const getPostAuthPath = (role: string) => {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'instructor') return '/instructor/courses';
  return '/dashboard';
};

const EDUCATIONAL_LEVELS = [
  { id: 25, label: 'Primary' },
  { id: 26, label: 'Preparatory' },
  { id: 27, label: 'High School' },
  { id: 28, label: 'University Undergraduate' },
  { id: 29, label: 'University Postgraduate' },
];

// ─────────────────────────────────────────────────────────────────────────────

export function SignUpView() {
  const router = useRouter();
  const theme = useTheme();
  const { register } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [fullNameAr, setFullNameAr] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [educationalLevelId, setEducationalLevelId] = useState<number>(25);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<SignUpFieldErrors>({});
  const [isShaking, setIsShaking] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  const passwordStrength = useMemo(() => validatePassword(password), [password]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const triggerShake = useCallback(() => {
    setIsShaking(true);
    setAttemptCount((c) => c + 1);
    setTimeout(() => setIsShaking(false), 600);
  }, []);

  const clearField = useCallback((field: keyof SignUpFieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  // ── Client-side Validation ───────────────────────────────────────────────────

  const validateForm = useCallback(() => {
    const next: SignUpFieldErrors = {};
    const englishNameRegex = /^[A-Za-z\s.'-]+$/;
    const arabicNameRegex = /^[\u0600-\u06FF\s]+$/;
    const nationalIdRegex = /^\d{14}$/;
    const phoneRegex = /^\+?\d{10,15}$/;

    if (!fullNameEn.trim()) next.fullNameEn = 'Full name in English is required.';
    else if (!englishNameRegex.test(fullNameEn.trim()))
      next.fullNameEn = 'Use English letters only.';

    if (!fullNameAr.trim()) next.fullNameAr = 'Full name in Arabic is required.';
    else if (!arabicNameRegex.test(fullNameAr.trim()))
      next.fullNameAr = 'Use Arabic letters only.';

    if (!email.trim()) next.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = 'Enter a valid email address.';

    if (!nationalId.trim()) next.nationalId = 'National ID is required.';
    else if (!nationalIdRegex.test(nationalId.trim()))
      next.nationalId = 'National ID must be exactly 14 digits.';

    if (!phone.trim()) next.phone = 'Phone number is required.';
    else if (!phoneRegex.test(phone.trim()))
      next.phone = 'Must contain 10 – 15 digits.';

    if (!password) next.password = 'Password is required.';
    else if (!passwordStrength.isValid)
      next.password = passwordStrength.feedback[0] || 'Choose a stronger password.';

    if (!confirmPassword) next.confirmPassword = 'Please confirm your password.';
    else if (password !== confirmPassword) next.confirmPassword = 'Passwords do not match.';

    if (!educationalLevelId) next.educationalLevelId = 'Educational level is required.';

    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }, [
    confirmPassword,
    educationalLevelId,
    email,
    fullNameAr,
    fullNameEn,
    nationalId,
    password,
    passwordStrength,
    phone,
  ]);

  // ── Submit ────────────────────────────────────────────────────────────────────

  const handleSignUp = useCallback(async () => {
    if (!validateForm()) {
      setError('Please fix the highlighted fields before continuing.');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = await register({
        email,
        password,
        nationalId,
        fullNameEn,
        fullNameAr,
        phone,
        educationalLevelId,
      });

      router.push(getPostAuthPath(user.role));
    } catch (err) {
      // Form state is intentionally preserved — no page reload

      if (err instanceof ValidationError) {
        const next: SignUpFieldErrors = {};
        Object.entries(err.errors).forEach(([key, values]) => {
          const message = values?.[0];
          if (!message) return;
          const lowerKey = key.toLowerCase();

          if (lowerKey.includes('email')) next.email = message;
          else if (lowerKey.includes('password') && !lowerKey.includes('confirm'))
            next.password = message;
          else if (lowerKey.includes('confirm')) next.confirmPassword = message;
          else if (lowerKey.includes('fullnameen') || lowerKey.includes('english'))
            next.fullNameEn = message;
          else if (lowerKey.includes('fullnamear') || lowerKey.includes('arabic'))
            next.fullNameAr = message;
          else if (lowerKey.includes('nationalid') || lowerKey.includes('national'))
            next.nationalId = message;
          else if (lowerKey.includes('phone') || lowerKey.includes('mobile'))
            next.phone = message;
          else if (lowerKey.includes('educational') || lowerKey.includes('level'))
            next.educationalLevelId = message;
          else {
            const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
            next[normalizedKey as keyof SignUpFieldErrors] = message;
          }
        });
        setFieldErrors(next);
        setError(err.message || 'Please review your information and try again.');
      } else if (err instanceof ApiError) {
        if (err.status === 409) {
          const message = err.message || 'This account already exists.';
          setFieldErrors((prev) => ({
            ...prev,
            ...(message.toLowerCase().includes('email') && { email: message }),
            ...(message.toLowerCase().includes('national id') && { nationalId: message }),
          }));
          setError(message);
        } else if (err.status === 0) {
          setError('Unable to connect to the server. Please check your connection.');
        } else {
          setError(err.message || 'An unexpected error occurred. Please try again.');
        }
      } else if (err instanceof Error) {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }

      triggerShake();
    } finally {
      setLoading(false);
    }
  }, [
    educationalLevelId,
    email,
    fullNameAr,
    fullNameEn,
    nationalId,
    password,
    phone,
    register,
    router,
    triggerShake,
    validateForm,
  ]);

  // ── Styles ────────────────────────────────────────────────────────────────────

  const isDark = theme.palette.mode === 'dark';

  const fieldSx = {
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
    '& .MuiFormHelperText-root': { fontWeight: 500 },
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <motion.div
      key="sign-up-card"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: isShaking ? [0, -12, 12, -8, 8, -4, 4, 0] : 0,
      }}
      transition={{
        opacity: { duration: 0.5 },
        scale: { duration: 0.5, type: 'spring', bounce: 0.2 },
        x: { duration: 0.5, type: 'tween', ease: 'easeInOut' },
      }}
      style={{
        width: '100%',
        maxWidth: 600,
        margin: '0 auto',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '24px 0',
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
              {t('auth.signUp')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Join GenZCoders and start your learning journey.
            </Typography>
          </Box>

          {/* ── Animated Error Banner ──────────────────────────────────────── */}
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
                    <Iconify icon="solar:danger-triangle-bold" width={20} sx={{ mt: 0.15 }} />
                  }
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`,
                    bgcolor: alpha(theme.palette.error.main, isDark ? 0.12 : 0.06),
                    color: 'error.dark',
                    '& .MuiAlert-message': {
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                    },
                    '& .MuiAlert-icon': { color: 'error.main' },
                  }}
                >
                  {error}
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Form ──────────────────────────────────────────────────────── */}
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSignUp();
            }}
          >
            <Stack spacing={2.5}>
              {/* Full Names Row */}
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                }}
              >
                <TextField
                  fullWidth
                  name="fullNameEn"
                  label="Full Name (EN)"
                  placeholder="John Doe"
                  value={fullNameEn}
                  onChange={(e) => {
                    setFullNameEn(e.target.value);
                    clearField('fullNameEn');
                  }}
                  error={Boolean(fieldErrors.fullNameEn)}
                  helperText={fieldErrors.fullNameEn}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={fieldSx}
                />

                <TextField
                  fullWidth
                  name="fullNameAr"
                  label="الاسم الكامل (AR)"
                  placeholder="محمد أحمد"
                  value={fullNameAr}
                  onChange={(e) => {
                    setFullNameAr(e.target.value);
                    clearField('fullNameAr');
                  }}
                  error={Boolean(fieldErrors.fullNameAr)}
                  helperText={fieldErrors.fullNameAr}
                  inputProps={{ dir: 'rtl' }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={fieldSx}
                />
              </Box>

              {/* National ID + Phone Row */}
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                }}
              >
                <TextField
                  fullWidth
                  name="nationalId"
                  label="National ID"
                  placeholder="14-digit number"
                  value={nationalId}
                  onChange={(e) => {
                    setNationalId(e.target.value.replace(/\D/g, '').slice(0, 14));
                    clearField('nationalId');
                  }}
                  error={Boolean(fieldErrors.nationalId)}
                  helperText={
                    fieldErrors.nationalId ||
                    (nationalId.length > 0 && nationalId.length < 14
                      ? `${nationalId.length}/14 digits`
                      : undefined)
                  }
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={fieldSx}
                />

                <TextField
                  fullWidth
                  name="phone"
                  label="Phone Number"
                  placeholder="+201234567890"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    clearField('phone');
                  }}
                  error={Boolean(fieldErrors.phone)}
                  helperText={fieldErrors.phone}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={fieldSx}
                />
              </Box>

              {/* Email */}
              <TextField
                fullWidth
                name="email"
                label={t('auth.email')}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearField('email');
                }}
                autoComplete="email"
                error={Boolean(fieldErrors.email)}
                helperText={fieldErrors.email}
                slotProps={{
                  inputLabel: { shrink: true },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Iconify
                          icon="solar:letter-bold"
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
                sx={fieldSx}
              />

              {/* Password Row */}
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                }}
              >
                <Box>
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
                    autoComplete="new-password"
                    error={Boolean(fieldErrors.password)}
                    helperText={fieldErrors.password}
                    slotProps={{
                      inputLabel: { shrink: true },
                      input: {
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
                                width={18}
                              />
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={fieldSx}
                  />
                  {password && <PasswordStrengthIndicator strength={passwordStrength} />}
                </Box>

                <TextField
                  fullWidth
                  name="confirmPassword"
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearField('confirmPassword');
                  }}
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  error={Boolean(fieldErrors.confirmPassword)}
                  helperText={fieldErrors.confirmPassword}
                  slotProps={{
                    inputLabel: { shrink: true },
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                            edge="end"
                            size="small"
                            tabIndex={-1}
                          >
                            <Iconify
                              icon={showConfirmPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                              width={18}
                            />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={fieldSx}
                />
              </Box>

              {/* Educational Level */}
              <FormControl
                fullWidth
                error={Boolean(fieldErrors.educationalLevelId)}
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: 2 },
                }}
              >
                <InputLabel shrink>Educational Level</InputLabel>
                <Select
                  value={educationalLevelId}
                  label="Educational Level"
                  onChange={(e) => {
                    setEducationalLevelId(Number(e.target.value));
                    clearField('educationalLevelId');
                  }}
                >
                  {EDUCATIONAL_LEVELS.map((level) => (
                    <MenuItem key={level.id} value={level.id}>
                      {level.label}
                    </MenuItem>
                  ))}
                </Select>
                {fieldErrors.educationalLevelId && (
                  <FormHelperText>{fieldErrors.educationalLevelId}</FormHelperText>
                )}
              </FormControl>

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
                    {t('auth.creatingAccount')}
                  </Stack>
                ) : (
                  t('auth.signUp')
                )}
              </Button>
            </Stack>
          </Box>

          {/* Footer */}
          <Typography variant="body2" align="center" sx={{ color: 'text.secondary' }}>
            Already have an account?{' '}
            <Link
              component={RouterLink}
              href="/sign-in"
              sx={{ fontWeight: 700, textDecoration: 'none' }}
            >
              Sign in
            </Link>
          </Typography>
        </Stack>
      </Card>
    </motion.div>
  );
}
