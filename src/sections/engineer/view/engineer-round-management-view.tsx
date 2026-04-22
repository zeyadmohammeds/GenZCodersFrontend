import type { CourseRoundDto } from 'src/api/models/course-round';
import type { CourseRoundStudentDto } from 'src/api/models/course-round-student';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import LinearProgress from '@mui/material/LinearProgress';

import { DashboardContent } from 'src/layouts/dashboard';
import { courseRoundApi, courseRoundStudentApi } from 'src/api';

import { Iconify } from 'src/components/iconify';

import { 
  PageHeader, 
  EngineeringFrame 
} from '../engineer-styles';

// ----------------------------------------------------------------------

export function EngineerRoundManagementView() {
  const theme = useTheme();

  const paletteMainByKey = {
    primary: theme.palette.primary.main,
    success: theme.palette.success.main,
    info: theme.palette.info.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
  } as const;
  
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [courseRounds, setCourseRounds] = useState<CourseRoundDto[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [assignedStudents, setAssignedStudents] = useState<CourseRoundStudentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCourseRounds = useCallback(async () => {
    if (!selectedCourseId) return;
    try {
      setLoading(true);
      setError(null);
      const allRounds: CourseRoundDto[] = await courseRoundApi.getAll();
      const roundsForCourse = allRounds.filter((r) => r.courseId === selectedCourseId);
      setCourseRounds(roundsForCourse);
    } catch (err) {
      setError('Failed to load rounds for synchronization.');
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId]);

  const loadRoundData = useCallback(async () => {
    if (!selectedRoundId) {
      setAssignedStudents([]);
      return;
    }
    try {
      setLoading(true);
      const students = await courseRoundStudentApi.getByCourseRoundId(selectedRoundId);
      setAssignedStudents(students);
    } catch (err) {
      setError('Technical error syncing student records.');
    } finally {
      setLoading(false);
    }
  }, [selectedRoundId]);

  useEffect(() => {
    if (selectedCourseId) loadCourseRounds();
  }, [selectedCourseId, loadCourseRounds]);

  useEffect(() => {
    if (selectedRoundId) loadRoundData();
  }, [selectedRoundId, loadRoundData]);

  const selectedRound = courseRounds.find(r => r.id === selectedRoundId);

  return (
    <DashboardContent>
      <Container maxWidth="xl">
        <Stack spacing={4}>
          <PageHeader>
            <Stack direction="row" alignItems="center" spacing={3}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Iconify icon="solar:history-bold-duotone" width={32} />
              </Box>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -1 }}>
                  Round Control Center
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.9, fontWeight: 500 }}>
                  Advanced orchestration of course lifecycles and student capacity.
                </Typography>
              </Box>
            </Stack>
          </PageHeader>

          <Grid container spacing={3}>
            {/* Left Control Panel */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack spacing={3}>
                <EngineeringFrame>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Target Scope</Typography>
                  <TextField
                    fullWidth
                    label="Internal Course ID"
                    type="number"
                    value={selectedCourseId || ''}
                    onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : null)}
                    placeholder="Enter technical course ID"
                    sx={{ mb: 2 }}
                    InputProps={{
                      startAdornment: <Iconify icon="solar:key-bold" sx={{ mr: 1, color: 'primary.main' }} />
                    }}
                  />
                  <Button 
                    variant="contained" 
                    fullWidth 
                    color="primary" 
                    onClick={loadCourseRounds} 
                    disabled={!selectedCourseId || loading}
                    sx={{ fontWeight: 800, borderRadius: 2 }}
                  >
                    Sync Round Data
                  </Button>
                </EngineeringFrame>

                {error && (
                  <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
                )}

                {courseRounds.length > 0 && (
                   <EngineeringFrame sx={{ p: 0, overflow: 'hidden' }}>
                      <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderBottom: '1px solid', borderColor: 'divider' }}>
                         <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Available Rounds Index</Typography>
                      </Box>
                      <Stack spacing={0}>
                         {courseRounds.map((round) => (
                            <Box
                              key={round.id}
                              onClick={() => setSelectedRoundId(round.id)}
                              sx={{
                                p: 2,
                                cursor: 'pointer',
                                borderLeft: '4px solid',
                                borderLeftColor: selectedRoundId === round.id ? 'primary.main' : 'transparent',
                                bgcolor: selectedRoundId === round.id ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) }
                              }}
                            >
                               <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Box>
                                     <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Round {round.roundNumber}</Typography>
                                     <Typography variant="caption" sx={{ color: 'text.secondary' }}>ID: {round.id}</Typography>
                                  </Box>
                                  <Chip 
                                    label={round.status || 'UNSET'} 
                                    size="small" 
                                    sx={{ fontWeight: 700, borderRadius: 1 }} 
                                    color={round.status === 'Active' ? 'success' : 'default'}
                                  />
                               </Stack>
                            </Box>
                         ))}
                      </Stack>
                   </EngineeringFrame>
                )}
              </Stack>
            </Grid>

            {/* Right Detailed Execution View */}
            <Grid size={{ xs: 12, md: 8 }}>
              {selectedRound ? (
                <Stack spacing={3}>
                  <EngineeringFrame>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 4 }}>
                       <Box>
                          <Typography variant="h4" sx={{ fontWeight: 900 }}>Execution Details: Round {selectedRound.roundNumber}</Typography>
                          <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            {new Date(selectedRound.startDate).toLocaleDateString(undefined, { dateStyle: 'long' })} — {new Date(selectedRound.endDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
                          </Typography>
                       </Box>
                       <Stack direction="row" spacing={1}>
                          <Tooltip title="Technical Diagnostics">
                             <Button variant="outlined" sx={{ minWidth: 0, p: 1, borderRadius: 1.5 }}><Iconify icon="solar:settings-minimalistic-bold" /></Button>
                          </Tooltip>
                          <Button variant="contained" color="primary" sx={{ fontWeight: 900, borderRadius: 2 }}>Workflow Jump</Button>
                       </Stack>
                    </Stack>

                    <Grid container spacing={3} sx={{ mb: 4 }}>
                       {[
                         { label: 'Min Capacity', value: selectedRound.minStudents || 0, icon: 'solar:user-minus-bold', color: 'warning' },
                         { label: 'Max Capacity', value: selectedRound.maxStudents || 0, icon: 'solar:user-plus-bold', color: 'info' },
                         { label: 'Current Load', value: assignedStudents.length, icon: 'solar:users-group-rounded-bold', color: 'success' },
                         { label: 'Unit Valuation', value: `$${selectedRound.price || 0}`, icon: 'solar:tag-bold', color: 'primary' },
                       ].map((item) => (
                         <Grid key={item.label} size={{ xs: 6, sm: 3 }}>
                            <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha((paletteMainByKey as any)[item.color] || theme.palette.primary.main, 0.05), textAlign: 'center', border: '1px solid', borderColor: alpha((paletteMainByKey as any)[item.color] || theme.palette.primary.main, 0.1) }}>
                               <Typography variant="h5" sx={{ fontWeight: 900 }}>{item.value}</Typography>
                               <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</Typography>
                            </Box>
                         </Grid>
                       ))}
                    </Grid>

                    <Box sx={{ p: 3, borderRadius: 2, bgcolor: theme.palette.grey[900], color: 'white' }}>
                       <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, opacity: 0.8, textTransform: 'uppercase' }}>System Engagement Projection</Typography>
                       <Stack direction="row" spacing={2} alignItems="center">
                          <LinearProgress 
                            variant="determinate" 
                            value={(assignedStudents.length / (selectedRound.maxStudents || 100)) * 100} 
                            sx={{ flexGrow: 1, height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.1)' }} 
                          />
                          <Typography variant="h6" sx={{ fontWeight: 900 }}>{Math.round((assignedStudents.length / (selectedRound.maxStudents || 100)) * 100)}%</Typography>
                       </Stack>
                    </Box>
                  </EngineeringFrame>

                  <EngineeringFrame sx={{ p: 0 }}>
                     <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>Member Synchronization Audit</Typography>
                        <Button size="small" variant="text" color="primary" sx={{ fontWeight: 800 }}>Audit Records</Button>
                     </Box>
                     {loading ? (
                       <Box sx={{ p: 4 }}><LinearProgress /></Box>
                     ) : (
                       <Stack spacing={0}>
                          {assignedStudents.length === 0 ? (
                            <Box sx={{ p: 6, textAlign: 'center' }}>
                               <Typography variant="body2" sx={{ color: 'text.secondary' }}>Zero synchronized records found for this round cycle.</Typography>
                            </Box>
                          ) : assignedStudents.map((student) => (
                            <Box
                              key={student.id}
                              sx={{
                                p: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) }
                              }}
                            >
                               <Stack direction="row" spacing={2} alignItems="center">
                                  <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', display: 'grid', placeItems: 'center', fontWeight: 900 }}>
                                     {student.studentName.charAt(0)}
                                  </Box>
                                  <Box>
                                     <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{student.studentName}</Typography>
                                     <Typography variant="caption" sx={{ color: 'text.secondary' }}>{student.studentEmail}</Typography>
                                  </Box>
                               </Stack>
                               <Stack direction="row" spacing={3} alignItems="center">
                                  <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                                     <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>SYNCED AT</Typography>
                                     <Typography variant="body2" sx={{ fontWeight: 600 }}>{new Date(student.assignedAt).toLocaleDateString()}</Typography>
                                  </Box>
                                  <Button size="small" color="error" variant="outlined" sx={{ fontWeight: 800, borderRadius: 1 }}>De-sync</Button>
                               </Stack>
                            </Box>
                          ))}
                       </Stack>
                     )}
                  </EngineeringFrame>
                </Stack>
              ) : (
                <EngineeringFrame sx={{ height: '100%', display: 'grid', placeItems: 'center', p: 8, textAlign: 'center', border: '1px dashed', borderColor: 'divider', bgcolor: 'transparent' }}>
                   <Box>
                      <Iconify icon="solar:monitor-bold-duotone" width={64} sx={{ color: 'text.disabled', mb: 2 }} />
                      <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.secondary' }}>Awaiting Technical Scope</Typography>
                      <Typography variant="body2" sx={{ color: 'text.disabled' }}>Select a round cycle from the left index to initialize the orchestration audit.</Typography>
                   </Box>
                </EngineeringFrame>
              )}
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </DashboardContent>
  );
}
