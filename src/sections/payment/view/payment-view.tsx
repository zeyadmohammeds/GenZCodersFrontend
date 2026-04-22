import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import { alpha, useTheme } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';

import { paymentProofStorage } from 'src/utils/payment-proof-storage';
import { buildOptimizedDeliveryUrl, uploadToCloudinaryUnsigned, getCloudinaryCloudNameFromUrl } from 'src/utils/cloudinary-upload';

import { DashboardContent } from 'src/layouts/dashboard';
import { useAuth } from 'src/contexts/simple-auth-context';
import { ApiError, mediaApi, applicationApi } from 'src/api';
import { mapApplicationDtoToUi } from 'src/api/mappers/application.mapper';
import { useApplicationsContext } from 'src/contexts/applications-context';
import { useCourseRoundsContext } from 'src/contexts/course-rounds-context';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const premiumGlass = (theme: any) => ({
  background: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(20px)',
  border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
  boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.05)}`,
  borderRadius: 3,
});

type PaymentViewProps = {
  applicationId: string;
};

export function PaymentView({ applicationId }: PaymentViewProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const { applications } = useApplicationsContext();
  const { assignStudentsToRound, getRoundById } = useCourseRoundsContext();
  const [appError, setAppError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [optimizedUrl, setOptimizedUrl] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const cloudName = useMemo(
    () => getCloudinaryCloudNameFromUrl(import.meta.env.VITE_CLOUDINARY_URL as string | undefined),
    []
  );
  const uploadPreset = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined) ?? '';

  const [appFetched, setAppFetched] = useState<typeof appFromContext | null>(null);
  const appFromContext = useMemo(
    () => applications.find((a) => String(a.id) === String(applicationId)),
    [applications, applicationId]
  );
  const app = appFromContext ?? appFetched;

  useEffect(() => {
    if (!applicationId || appFromContext) return;
    const load = async () => {
      try {
        const dto = await applicationApi.getApplicationById(applicationId);
        const mapped = mapApplicationDtoToUi(dto);
        const round = getRoundById ? getRoundById(String(dto.courseRoundId)) : undefined;
        const courseId = round?.courseId ?? mapped.courseId;
        setAppFetched({ ...mapped, courseId });
      } catch {
        setAppError('Application not found.');
      }
    };
    load();
  }, [applicationId, appFromContext, getRoundById]);

  useEffect(() => {
    if (!selectedFile) {
      setLocalPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(selectedFile);
    setLocalPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  useEffect(() => {
    const stored = paymentProofStorage.get(String(applicationId));
    if (!stored) return;
    setUploadedUrl(stored.url);
    setOptimizedUrl(stored.optimizedUrl);
  }, [applicationId]);

  useEffect(() => {
    let active = true;

    const tableId = Number(applicationId);
    if (!Number.isFinite(tableId)) return () => {
      active = false;
    };

    const loadFromBackend = async () => {
      try {
        const tryLoad = async (tableName: string): Promise<string> => {
          const res = await mediaApi.getByTable({ tableName, tableId });
          const medias = mediaApi.normalizeMany(res);
          const latest = medias[medias.length - 1];
          return latest?.filePath ?? '';
        };

        const filePath = (await tryLoad('Application').catch(() => '')) || (await tryLoad('application').catch(() => ''));

        if (!active) return;
        if (!filePath) return;

        setUploadedUrl(filePath);
        setOptimizedUrl(filePath);
        setSuccess(true);
      } catch {
        // ignore
      }
    };

    loadFromBackend();

    return () => {
      active = false;
    };
  }, [applicationId]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleUpload = useCallback(async () => {
    if (!applicationId) return;
    if (!selectedFile) return;

    setUploading(true);
    setAppError(null);

    let uploadedUrlResult: string;
    let optimizedUrlResult: string;
    let publicId = '';

    try {
      try {
        const serverResult = await mediaApi.upload(selectedFile, 'payment_proofs');
        uploadedUrlResult = serverResult.url;
        optimizedUrlResult = serverResult.url;
      } catch (serverErr) {
        if (!cloudName || !uploadPreset) {
          setAppError('Upload failed. Server upload unavailable and Cloudinary is not configured (add VITE_CLOUDINARY_URL and VITE_CLOUDINARY_UPLOAD_PRESET).');
          return;
        }
        const uploaded = await uploadToCloudinaryUnsigned({
          file: selectedFile,
          cloudName,
          uploadPreset,
          folder: 'payment_proofs',
        });
        uploadedUrlResult = uploaded.secure_url;
        optimizedUrlResult = buildOptimizedDeliveryUrl({ cloudName, publicId: uploaded.public_id, width: 1000 });
        publicId = uploaded.public_id;
      }

      paymentProofStorage.set({
        applicationId: String(applicationId),
        publicId: publicId || uploadedUrlResult,
        url: uploadedUrlResult,
        optimizedUrl: optimizedUrlResult,
        createdAt: new Date().toISOString(),
      });

      const tableId = Number(applicationId);
      if (Number.isFinite(tableId)) {
        try {
          const tryCreate = async (tableName: string) => {
            await mediaApi.create({ tableName, tableId, filePath: uploadedUrlResult });
          };

          const deleteExisting = async (tableName: string) => {
            const existingRes = await mediaApi.getByTable({ tableName, tableId });
            const existing = mediaApi.normalizeMany(existingRes);
            await Promise.all(
              existing
                .filter((m) => m?.id != null)
                .map((m) => mediaApi.delete(Number(m.id)).catch(() => undefined))
            );
          };

          const tableNames = ['Application'];
          let saved = false;
          let lastError: unknown;

          for (const name of tableNames) {
            try {
              await tryCreate(name);
              saved = true;
              break;
            } catch (error) {
              lastError = error;
              try {
                await deleteExisting(name);
                await tryCreate(name);
                saved = true;
                break;
              } catch (retryError) {
                lastError = retryError;
              }
            }
          }

          if (!saved) {
            throw lastError;
          }

          try {
            await applicationApi.updateApplicationStatus(tableId, { statusId: 42 });
          } catch (error) {
            const apiError = error instanceof ApiError ? error : null;
            const suffix = apiError?.status ? ` (status ${apiError.status})` : '';
            setAppError(
              apiError
                ? `${apiError.message}${suffix}`
                : 'Receipt uploaded, but failed to set application status to Paid.'
            );
            console.error('Failed to set application status to Paid', error);
          }

          const roundId = app?.courseRoundId;
          const courseId = app?.courseId;
          const studentId = user?.id;
          if (roundId && courseId && studentId) {
            try {
              await assignStudentsToRound({ courseId, roundId: String(roundId), studentIds: [studentId] });
            } catch (error) {
              console.error('Failed to assign student to course round', error);
            }
          }
        } catch (error) {
          const apiError = error instanceof ApiError ? error : null;
          console.error('Failed to save receipt media - Full error:', error);
          console.error('ApiError details:', { 
            message: apiError?.message, 
            status: apiError?.status, 
            data: apiError?.data 
          });
          const suffix = apiError?.status ? ` (status ${apiError.status})` : '';
          const backendMessage = apiError?.data && typeof apiError.data === 'object' 
            ? (apiError.data as any).message 
            : null;
          setAppError(
            backendMessage 
              ? `${backendMessage}${suffix}`
              : apiError
                ? `${apiError.message}${suffix}`
                : 'Receipt uploaded, but failed to save it on the server. Please try again.'
          );
          return;
        }
      }

      setUploadedUrl(uploadedUrlResult);
      setOptimizedUrl(optimizedUrlResult);
      setSuccess(true);
    } catch (e: any) {
      setAppError(e?.message || e?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [app?.courseId, app?.courseRoundId, applicationId, assignStudentsToRound, cloudName, selectedFile, uploadPreset, user?.id]);

  const goToMyCourses = useCallback(() => {
    window.location.href = '/my-courses';
  }, []);

  const handleFileDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  if (!applicationId) {
    return (
      <DashboardContent>
        <Container maxWidth="lg">
          <Alert severity="error">Invalid payment link. Please go to My Applications and click Complete Payment.</Alert>
        </Container>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <Container maxWidth="lg">
        {/* Background Mesh */}
        <Box
          sx={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: -1,
            background: `radial-gradient(circle at 10% 20%, ${alpha(theme.palette.primary.lighter, 0.2)} 0%, transparent 40%),
                         radial-gradient(circle at 90% 80%, ${alpha(theme.palette.secondary.lighter, 0.2)} 0%, transparent 40%)`,
          }}
        />

        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography variant="h3" fontWeight={800} sx={{ mb: 2 }}>
            Complete Your Enrollment
          </Typography>
          <Typography variant="h6" color="text.secondary" fontWeight={500} sx={{ maxWidth: 600, mx: 'auto' }}>
            To activate your access, simply transfer the course fees and upload your receipt below.
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 340px' }, gap: 4 }}>
          {/* Main Content: Payment Methods & Upload */}
          <Stack spacing={4}>
            <Card sx={{ ...premiumGlass(theme), overflow: 'hidden' }}>
              <Box sx={{ p: 3, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                <Typography variant="h6" fontWeight={800} display="flex" alignItems="center" gap={1}>
                  <Iconify icon="solar:wallet-money-bold-duotone" width={24} sx={{ color: 'primary.main' }} />
                  Payment Methods
                </Typography>
              </Box>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                  {[
                    { label: 'InstaPay', number: '01000000000', name: 'GenZCoders', icon: 'solar:smartphone-2-bold-duotone', colorKey: 'primary' },
                    { label: 'Vodafone Cash', number: '01000000000', name: 'GenZCoders', icon: 'solar:card-transfer-bold-duotone', colorKey: 'error' }
                  ].map((method) => (
                    (() => {
                      const methodColor =
                        method.colorKey === 'error' ? theme.palette.error.main : theme.palette.primary.main;

                      return (
                        <Box
                          key={method.label}
                          sx={{
                            p: 3,
                            borderRadius: 3,
                            border: `1px dashed ${alpha(theme.palette.grey[500], 0.2)}`,
                            bgcolor: alpha(theme.palette.background.default, 0.5),
                            transition: 'all 0.3s',
                            '&:hover': { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.04) },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: alpha(methodColor, 0.1), color: methodColor }}>
                              <Iconify icon={method.icon} width={24} />
                            </Box>
                            <Box>
                              <Typography variant="subtitle2">{method.label}</Typography>
                              <Typography variant="caption" color="text.secondary">{method.name}</Typography>
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'background.paper', p: 1, borderRadius: 1.5, border: `1px solid ${theme.palette.divider}` }}>
                            <Typography variant="h6" fontWeight={800} sx={{ ml: 1 }}>{method.number}</Typography>
                            <Tooltip title={copied === method.label ? "Copied!" : "Copy"}>
                              <IconButton size="small" onClick={() => handleCopy(method.number, method.label)}>
                                <Iconify icon={copied === method.label ? "solar:check-circle-bold" : "solar:copy-bold"} sx={{ color: copied === method.label ? 'success.main' : 'text.secondary' }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      );
                    })()
                  ))}
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ ...premiumGlass(theme) }}>
              <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight={800} display="flex" alignItems="center" gap={1}>
                  <Iconify icon="solar:upload-square-bold-duotone" width={24} sx={{ color: 'info.main' }} />
                  Upload Receipt
                </Typography>
                {success ? (
                  <Chip label="Payment Saved" color="success" variant="filled" icon={<Iconify icon="solar:verified-check-bold" />} />
                ) : null}
              </Box>

              <Divider sx={{ borderStyle: 'dashed' }} />

              <CardContent sx={{ p: 4 }}>
                {appError ? <Alert severity="error" sx={{ mb: 3 }}>{appError}</Alert> : null}

                {!success ? (
                  <Box
                    component="label"
                    onDrop={handleFileDrop}
                    onDragOver={(e) => e.preventDefault()}
                    sx={{
                      border: `2px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
                      borderRadius: 3,
                      p: 6,
                      textAlign: 'center',
                      cursor: 'pointer',
                      display: 'block',
                      transition: 'all 0.3s',
                      bgcolor: alpha(theme.palette.primary.main, 0.02),
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                      },
                    }}
                  >
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    />

                    {selectedFile ? (
                      <Box>
                        <Box
                          component="img"
                          src={localPreviewUrl}
                          sx={{
                            height: 200,
                            width: '100%',
                            objectFit: 'cover',
                            borderRadius: 2,
                            mb: 2,
                          }}
                        />
                        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{selectedFile.name}</Typography>
                        <Typography variant="caption" color="text.secondary">Click again to change file</Typography>
                      </Box>
                    ) : (
                      <Box>
                        <Iconify icon="solar:cloud-upload-bold-duotone" width={56} sx={{ color: 'primary.main', mb: 2 }} />
                        <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>Drop your receipt here</Typography>
                        <Typography variant="body2" color="text.secondary">or click to browse</Typography>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Iconify icon="solar:check-circle-bold-duotone" width={72} sx={{ color: 'success.main', mb: 2 }} />
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>Receipt Saved</Typography>
                    <Typography variant="body2" color="text.secondary">Your payment proof is stored and your enrollment is being activated.</Typography>
                    <Box sx={{ mt: 3 }}>
                      <Button variant="contained" onClick={goToMyCourses} sx={{ borderRadius: 30, px: 4, fontWeight: 800 }}>
                        Go to My Courses
                      </Button>
                    </Box>
                  </Box>
                )}

                {!success ? (
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleUpload}
                      disabled={!selectedFile || uploading}
                      startIcon={uploading ? <CircularProgress size={20} /> : <Iconify icon="solar:upload-bold" />}
                      sx={{ borderRadius: 30, px: 4, fontWeight: 800 }}
                    >
                      {uploading ? 'Uploading...' : 'Upload & Confirm'}
                    </Button>
                  </Box>
                ) : null}
              </CardContent>
            </Card>
          </Stack>

          {/* Sidebar: Course Summary */}
          <Box>
            <Card sx={{ ...premiumGlass(theme), position: 'sticky', top: 100 }}>
              <Box sx={{ 
                 height: 140, 
                 background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                 display: 'flex', alignItems: 'center', justifyContent: 'center',
                 color: 'white'
              }}>
                <SvgColor src="/assets/icons/Iconly/Iconly/Curved/Outline/Category.svg" sx={{ width: 64, height: 64, opacity: 0.5 }} />
              </Box>
              <CardContent sx={{ p: 3 }}>
                <Chip
                  label="Application Approved"
                  color="success"
                  size="small"
                  variant="filled"
                  sx={{
                    mb: 2,
                    fontWeight: 700,
                    bgcolor: alpha(theme.palette.success.main, 0.12),
                    color: theme.palette.success.dark,
                  }}
                />
                <Typography variant="h5" fontWeight={800} gutterBottom>
                  {app?.metadata?.courseName || 'Selected Course'}
                </Typography>
                
                <Box sx={{ my: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
                  <Typography variant="subtitle2">Total Amount</Typography>
                  <Typography variant="h4" fontWeight={800} color="primary.main">
                    {app?.metadata?.coursePrice ?? 0} EGP
                  </Typography>
                </Box>

                <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                       <Iconify icon="solar:user-bold-duotone" width={20} sx={{ color: 'text.secondary' }} />
                       <Typography variant="body2" fontWeight={600} color="text.secondary">
                         Student: {app?.metadata?.fullName || 'You'}
                       </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                       <Iconify icon="solar:calendar-bold-duotone" width={20} sx={{ color: 'text.secondary' }} />
                       <Typography variant="body2" fontWeight={600} color="text.secondary">
                         Date: {new Date().toLocaleDateString()}
                       </Typography>
                    </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Container>
    </DashboardContent>
  );
}
