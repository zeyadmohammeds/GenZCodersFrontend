
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';

import { DashboardContent } from 'src/layouts/dashboard';
import { applicationApi, courseRoundApi } from 'src/api';
import { useCoursesContext } from 'src/contexts/courses-context';
import { useApplicationsContext } from 'src/contexts/applications-context';
import { useCourseRoundsContext } from 'src/contexts/course-rounds-context';

import { Iconify } from 'src/components/iconify';

import { 
  GlassCard, 
  PageHeader,
  GradientIcon
} from '../engineer-styles';

// ----------------------------------------------------------------------

export function EngineerApplicationsManagementView() {
  const theme = useTheme();
  const { applications, updateApplicationStatus } = useApplicationsContext();
  const { rounds } = useCourseRoundsContext();
  const { courses } = useCoursesContext();

  const [roundsList, setRoundsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoundId, setSelectedRoundId] = useState<string>('all');

  const [toast, setToast] = useState<{ open: boolean; severity: 'success' | 'error'; message: string }>({
    open: false,
    severity: 'success',
    message: '',
  });

  // Get pending applications
  const pendingApplications = useMemo(() => {
    let filtered = applications.filter(app => app.status === 'pending');
    
    if (selectedRoundId !== 'all') {
      filtered = filtered.filter(app => String(app.courseRoundId) === selectedRoundId);
    }
    
    return filtered.map((app: any) => {
      const roundId = Number(app.courseRoundId);
      const round = rounds.find((r: any) => Number(r.id) === roundId);
      const course = round ? courses.find((c: any) => Number(c.id) === Number(round.courseId)) : null;
      return {
        ...app,
        courseName: course?.name || 'Unknown Course',
        roundName: round ? `Round ${round.roundNumber}` : 'Unknown Round',
      };
    });
  }, [applications, selectedRoundId, rounds, courses]);

  const loadRounds = useCallback(async () => {
    try {
      setLoading(true);
      const all = await courseRoundApi.getAll();
      setRoundsList(all);
    } catch {
      setRoundsList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRounds();
  }, [loadRounds]);

  const handleAcceptApplication = async (appId: string) => {
    try {
      setLoading(true);
      await applicationApi.updateApplicationStatus(appId, { statusId: 17 });
      setToast({ open: true, severity: 'success', message: 'Application accepted successfully!' });
      // Refresh applications
      window.location.reload();
    } catch (e: any) {
      setToast({ open: true, severity: 'error', message: e?.message || 'Failed to accept application.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectApplication = async (appId: string) => {
    try {
      setLoading(true);
      await applicationApi.updateApplicationStatus(appId, { statusId: 19 });
      setToast({ open: true, severity: 'success', message: 'Application rejected!' });
      window.location.reload();
    } catch (e: any) {
      setToast({ open: true, severity: 'error', message: e?.message || 'Failed to reject application.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardContent>
      <Container maxWidth="xl">
        <Stack spacing={4}>
          <PageHeader>
            <Stack direction="row" spacing={3} alignItems="center">
              <GradientIcon>
                <Iconify icon="solar:users-group-rounded-bold-duotone" width={32} />
              </GradientIcon>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 900 }}>
                  Application Management
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.8 }}>
                  Review and manage student applications.
                </Typography>
              </Box>
            </Stack>
          </PageHeader>

          <GlassCard>
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControl sx={{ minWidth: 300 }}>
                <InputLabel>Filter by Round</InputLabel>
                <Select
                  value={selectedRoundId}
                  label="Filter by Round"
                  onChange={(e) => setSelectedRoundId(e.target.value)}
                >
                  <MenuItem value="all">All Rounds</MenuItem>
                  {roundsList.map((r) => (
                    <MenuItem key={r.id} value={String(r.id)}>
                      {r.courseName} - Round {r.roundNumber}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Chip 
                label={`${pendingApplications.length} Pending`} 
                color="warning" 
                sx={{ fontWeight: 700 }}
              />
            </Stack>
          </GlassCard>

          <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Table>
              <TableHead sx={{ bgcolor: 'background.neutral' }}>
                <TableRow>
                  <TableCell>Student Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Course</TableCell>
                  <TableCell>Round</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingApplications.map((app) => (
                  <TableRow key={app.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{app.metadata?.fullName || app.studentId}</TableCell>
                    <TableCell>{app.metadata?.email || 'No email'}</TableCell>
                    <TableCell>{app.courseName}</TableCell>
                    <TableCell>{app.roundName}</TableCell>
                    <TableCell>
                      <Chip 
                        label="Pending" 
                        color="warning"
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => handleAcceptApplication(app.id)}
                        sx={{ mr: 1 }}
                      >
                        Accept
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleRejectApplication(app.id)}
                      >
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {pendingApplications.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                      <Iconify icon="solar:document-add-bold" width={48} sx={{ color: 'text.disabled', mb: 2 }} />
                      <Typography variant="body1" color="text.secondary">
                        No pending applications.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>

        <Snackbar
          open={toast.open}
          autoHideDuration={4000}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setToast((prev) => ({ ...prev, open: false }))} severity={toast.severity} variant="filled">
            {toast.message}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardContent>
  );
}
