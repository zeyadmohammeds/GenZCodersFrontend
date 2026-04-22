import type { CourseRoundDto } from 'src/api/models/course-round';
import type { CourseRoundStudentDto } from 'src/api/models/course-round-student';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Snackbar from '@mui/material/Snackbar';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import useMediaQuery from '@mui/material/useMediaQuery';

import { DashboardContent } from 'src/layouts/dashboard';
import { courseRoundApi, courseRoundStudentApi } from 'src/api';

import { Iconify } from 'src/components/iconify';

type CourseRoundForView = {
  id: number;
  courseId: number;
  roundNumber: number;
  startDate: string;
  endDate: string;
  status: string;
  instructor: string;
};

export function InstructorCourseRoundManagementView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [courseRounds, setCourseRounds] = useState<CourseRoundForView[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [assignedStudents, setAssignedStudents] = useState<CourseRoundStudentDto[]>([]);
  
  // Dialogs
  const [assignStudentDialogOpen, setAssignStudentDialogOpen] = useState(false);
  
  // Forms
  const [assignStudentForm, setAssignStudentForm] = useState({ studentId: '' });
  
  const [toast, setToast] = useState<{ open: boolean; severity: 'success' | 'error'; message: string }>({
    open: false,
    severity: 'success',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  // Load course rounds
  const loadCourseRounds = useCallback(async () => {
    if (!selectedCourseId) return;
    try {
      setLoading(true);
      const allRounds: CourseRoundDto[] = await courseRoundApi.getAll();
      const roundsForCourse = allRounds.filter((r) => r.courseId === selectedCourseId);
      setCourseRounds(roundsForCourse.map((r) => ({
        id: r.id,
        courseId: r.courseId,
        roundNumber: r.roundNumber,
        startDate: r.startDate,
        endDate: r.endDate,
        status: r.status ?? String(r.statusId ?? ''),
        instructor: r.instructor ?? '',
      })));
    } catch (error: any) {
      setToast({ open: true, severity: 'error', message: error?.message || 'Failed to load course rounds' });
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId]);

  // Load materials, zoom meetings, and students for selected round
  const loadRoundData = useCallback(async () => {
    if (!selectedRoundId) {
      setAssignedStudents([]);
      return;
    }

    try {
      setLoading(true);
      const students = await courseRoundStudentApi.getByCourseRoundId(selectedRoundId);
      setAssignedStudents(students);
    } catch (error: any) {
      setToast({ open: true, severity: 'error', message: error?.message || 'Failed to load round data' });
    } finally {
      setLoading(false);
    }
  }, [selectedRoundId]);

  useEffect(() => {
    loadCourseRounds();
  }, [loadCourseRounds]);

  useEffect(() => {
    loadRoundData();
  }, [loadRoundData]);

  const handleAssignStudent = useCallback(async () => {
    if (!selectedRoundId || !assignStudentForm.studentId) return;
    try {
      await courseRoundStudentApi.assignStudent(selectedRoundId, {
        studentId: Number(assignStudentForm.studentId),
      });
      setToast({ open: true, severity: 'success', message: 'Student assigned successfully!' });
      setAssignStudentDialogOpen(false);
      setAssignStudentForm({ studentId: '' });
      await loadRoundData();
    } catch (error: any) {
      setToast({ open: true, severity: 'error', message: error?.message || 'Failed to assign student' });
    }
  }, [selectedRoundId, assignStudentForm, loadRoundData]);

  const handleUnassignStudent = useCallback(async (id: number) => {
    if (!confirm('Are you sure you want to unassign this student?')) return;
    try {
      await courseRoundStudentApi.unassignStudent(id);
      setToast({ open: true, severity: 'success', message: 'Student unassigned successfully!' });
      await loadRoundData();
    } catch (error: any) {
      setToast({ open: true, severity: 'error', message: error?.message || 'Failed to unassign student' });
    }
  }, [loadRoundData]);

  const selectedRound = courseRounds.find(r => r.id === selectedRoundId);

  return (
    <DashboardContent>
      <Container maxWidth="xl">
        {/* Premium Header */}
        <Box
          sx={{
            mb: 5,
            p: 4,
            borderRadius: 3,
            position: 'relative',
            overflow: 'hidden',
            background: `linear-gradient(135deg, ${theme.palette.grey[900]} 0%, ${theme.palette.primary.main} 100%)`,
            color: 'white',
            boxShadow: `0 24px 48px ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography variant="h3" sx={{ fontWeight: 900, mb: 1, letterSpacing: -1 }}>
              Course Round Management
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9, fontWeight: 500 }}>
              Manage active rounds, assignments, and student engagement flows.
            </Typography>
          </Box>
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)' }} />
        </Box>

        {/* Course Selection Area */}
        <Card sx={{ 
            mb: 4, 
            p: 3, 
            borderRadius: 2, 
            border: '1px solid', 
            borderColor: 'divider',
            background: `linear-gradient(to right, ${alpha(theme.palette.background.neutral, 0.5)}, ${theme.palette.background.paper})`
        }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
            <Box sx={{ flexGrow: 1, width: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                Operational Scope
              </Typography>
              <TextField
                fullWidth
                label="Target Course ID"
                type="number"
                value={selectedCourseId || ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  setSelectedCourseId(id);
                  setSelectedRoundId(null);
                }}
                placeholder="Enter numerical course identifier"
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.paper' } }}
              />
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<Iconify icon="solar:magnifer-bold" />}
              onClick={loadCourseRounds}
              disabled={!selectedCourseId || loading}
              sx={{ 
                height: 56, 
                px: 4, 
                fontWeight: 900,
                boxShadow: theme.shadows[4],
                bgcolor: theme.palette.grey[900],
                '&:hover': { bgcolor: theme.palette.common.black }
              }}
            >
              Initialize Scope
            </Button>
          </Stack>
        </Card>

        {/* Course Rounds Visualization */}
        {courseRounds.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
              <Box sx={{ width: 4, height: 24, bgcolor: 'primary.main', borderRadius: 1 }} />
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Active & Seasonal Rounds ({courseRounds.length})
              </Typography>
            </Stack>
            
            <Grid container spacing={3}>
              {courseRounds.map((round) => (
                <Grid key={round.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid',
                      borderColor: selectedRoundId === round.id ? 'primary.main' : 'divider',
                      bgcolor: selectedRoundId === round.id ? alpha(theme.palette.primary.main, 0.02) : 'background.paper',
                      '&:hover': { 
                        transform: 'translateY(-6px)',
                        boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.08)}`,
                        borderColor: theme.palette.primary.main 
                      },
                    }}
                    onClick={() => setSelectedRoundId(round.id)}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>Round {round.roundNumber}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            ID: #{round.id}
                          </Typography>
                        </Box>
                        <Chip 
                          label={round.status} 
                          size="small" 
                          color={round.status.toLowerCase() === 'active' ? 'success' : 'default'}
                          sx={{ fontWeight: 700, borderRadius: 1 }} 
                        />
                      </Stack>
                      
                      <Stack spacing={1.5} sx={{ mb: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Iconify icon="solar:calendar-bold" width={16} sx={{ color: 'primary.main' }} />
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {new Date(round.startDate).toLocaleDateString()} - {new Date(round.endDate).toLocaleDateString()}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Iconify icon="solar:user-bold" width={16} sx={{ color: 'text.secondary' }} />
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Lead: {round.instructor || 'Unassigned'}
                          </Typography>
                        </Stack>
                      </Stack>
                      
                      {selectedRoundId === round.id && (
                        <Box sx={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 4, bgcolor: 'primary.main' }} />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Detailed Management Panel */}
        {selectedRound && (
          <Box sx={{ mb: 5 }}>
            <Card sx={{ borderRadius: 3, boxShadow: theme.shadows[10], overflow: 'hidden' }}>
              <Box sx={{ 
                  p: 3, 
                  bgcolor: theme.palette.grey[900], 
                  color: 'white',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
              }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.2), color: 'primary.light' }}>
                     <Iconify icon="solar:settings-bold" width={24} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Management Center: Round {selectedRound.roundNumber}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>Granular control over student entries and round lifecycle.</Typography>
                  </Box>
                </Stack>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Iconify icon="solar:user-plus-bold" />}
                  onClick={() => setAssignStudentDialogOpen(true)}
                  sx={{ fontWeight: 900, borderRadius: 1.5 }}
                >
                  Assign New Candidate
                </Button>
              </Box>

              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Iconify icon="solar:users-group-rounded-bold" sx={{ color: 'primary.main' }} />
                  Enrolled Students ({assignedStudents.length})
                </Typography>
                
                {assignedStudents.length === 0 ? (
                  <Alert 
                    severity="info" 
                    variant="outlined" 
                    sx={{ borderRadius: 2, borderStyle: 'dashed' }}
                    icon={<Iconify icon="solar:info-circle-bold" />}
                  >
                    No students have been synchronized with this round yet.
                  </Alert>
                ) : (
                  <Grid container spacing={2}>
                    {assignedStudents.map((assignment) => (
                      <Grid key={assignment.id} size={{ xs: 12 }}>
                        <Box sx={{ 
                            p: 2.5, 
                            borderRadius: 2, 
                            bgcolor: alpha(theme.palette.background.neutral, 0.3),
                            border: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: 'background.paper',
                              borderColor: theme.palette.primary.main,
                              boxShadow: theme.shadows[2]
                            }
                        }}>
                          <Stack direction="row" spacing={2.5} alignItems="center">
                            <Box sx={{ 
                                width: 44, 
                                height: 44, 
                                borderRadius: '50%', 
                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                color: 'primary.main',
                                display: 'grid',
                                placeItems: 'center'
                            }}>
                               <Iconify icon="solar:user-bold" width={22} />
                            </Box>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{assignment.studentName}</Typography>
                              <Typography variant="body2" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                                {assignment.studentEmail} • <Typography variant="caption" sx={{ fontWeight: 600 }}>ID: {assignment.studentId}</Typography>
                              </Typography>
                            </Box>
                          </Stack>
                          
                          <Stack direction="row" spacing={3} alignItems="center">
                            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                               <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>Assigned Date</Typography>
                               <Typography variant="body2" sx={{ fontWeight: 600 }}>{new Date(assignment.assignedAt).toLocaleDateString()}</Typography>
                            </Box>
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                              onClick={() => handleUnassignStudent(assignment.id)}
                              sx={{ fontWeight: 800, borderRadius: 1.5 }}
                            >
                              Unassign
                            </Button>
                          </Stack>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Assign Student Dialog */}
        <Dialog 
            open={assignStudentDialogOpen} 
            onClose={() => setAssignStudentDialogOpen(false)} 
            maxWidth="sm" 
            fullWidth 
            fullScreen={isMobile}
            PaperProps={{ sx: { borderRadius: 2 } }}
        >
          <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Candidate Assignment</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
              <TextField
                fullWidth
                label="Student Numerical ID"
                type="number"
                value={assignStudentForm.studentId}
                onChange={(e) => setAssignStudentForm({ studentId: e.target.value })}
                required
                placeholder="Ex: 5021"
                autoFocus
                InputProps={{
                  startAdornment: <Iconify icon="solar:user-id-bold" sx={{ mr: 1, color: 'text.disabled' }} />
                }}
              />
              <Box sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.05), borderRadius: 1.5, border: `1px solid ${alpha(theme.palette.info.main, 0.1)}` }}>
                <Stack direction="row" spacing={1.5}>
                  <Iconify icon="solar:info-circle-bold" sx={{ color: 'info.main', mt: 0.3 }} />
                  <Typography variant="body2" sx={{ color: 'info.dark', fontWeight: 500 }}>
                    Entering a valid Account ID will instantly link the student record to this specific round cycle. Ensure the ID is correct before committing.
                  </Typography>
                </Stack>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button onClick={() => setAssignStudentDialogOpen(false)} sx={{ fontWeight: 700 }}>Dismiss</Button>
            <Button
              variant="contained"
              onClick={handleAssignStudent}
              disabled={!assignStudentForm.studentId}
              sx={{ fontWeight: 900, px: 3 }}
            >
              Verify & Assign
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={toast.open}
          autoHideDuration={4000}
          onClose={() => setToast({ ...toast, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setToast({ ...toast, open: false })} 
            severity={toast.severity} 
            variant="filled"
            sx={{ width: '100%', borderRadius: 1.5, fontWeight: 700 }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardContent>
  );
}
