import type { Course } from 'src/types/course';
import type { CourseRoundStudentDto } from 'src/api/models/course-round-student';
import type { CourseRoundDto, CourseRoundDetailsDto } from 'src/api/models/course-round';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import { alpha, useTheme } from '@mui/material/styles';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import useMediaQuery from '@mui/material/useMediaQuery';

import { DashboardContent } from 'src/layouts/dashboard';
import { useCoursesContext } from 'src/contexts/courses-context';
import { accountApi, courseRoundApi, courseRoundStudentApi, courseRoundInstructorApi } from 'src/api';

import { Iconify } from 'src/components/iconify';

import { 
  GlassCard, 
  PageHeader, 
  GradientIcon,
  EngineeringFrame
} from '../engineer-styles';

// ----------------------------------------------------------------------

type RoundStatusOption = { id: number; label: string };

const STATUS_OPTIONS: RoundStatusOption[] = [
  { id: 18, label: 'Open for Enrollment' },
  { id: 38, label: 'Scheduled' },
  { id: 20, label: 'Active' },
  { id: 21, label: 'Completed' },
  { id: 19, label: 'Cancelled' },
];

type RoundFormState = {
  courseId: number;
  roundNumber: number;
  startDate: string;
  endDate: string;
  minStudents: string;
  maxStudents: string;
  price: string;
  statusId: number;
  courseRoundGroupId: string;
  automatedWorkFlowJump: string;
  questions: string[];
};

const emptyQuestions = () => Array.from({ length: 10 }, () => '');

const buildRoundNumberForGroup = (parentRoundNumber: number, existingGroupsCount: number) => {
  const nextIndex = existingGroupsCount + 1;
  const suffix = nextIndex / 10;
  const value = Number(parentRoundNumber) + suffix;
  return Math.round(value * 100) / 100;
};

export function EngineerRoundsManagementView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { courses } = useCoursesContext();

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [rounds, setRounds] = useState<CourseRoundDto[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');

  const [selectedRoundDetails, setSelectedRoundDetails] = useState<CourseRoundDetailsDto | null>(null);
  const [groupRootDetails, setGroupRootDetails] = useState<CourseRoundDetailsDto | null>(null);

  const [assignedStudents, setAssignedStudents] = useState<CourseRoundStudentDto[]>([]);
  const [instructors, setInstructors] = useState<Array<{ id: number; fullName: string; email: string }>>([]);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; severity: 'success' | 'error'; message: string }>({
    open: false,
    severity: 'success',
    message: '',
  });

  const [roundDialog, setRoundDialog] = useState<{ open: boolean; mode: 'create' | 'edit' | 'create-group' }>(
    { open: false, mode: 'create' }
  );

  const [assignStudentDialogOpen, setAssignStudentDialogOpen] = useState(false);
  const [assignStudentId, setAssignStudentId] = useState('');

  const [assignInstructorDialogOpen, setAssignInstructorDialogOpen] = useState(false);
  const [selectedInstructorIds, setSelectedInstructorIds] = useState<number[]>([]);

  const [form, setForm] = useState<RoundFormState>(() => ({
    courseId: 0,
    roundNumber: 1,
    startDate: '',
    endDate: '',
    minStudents: '',
    maxStudents: '',
    price: '',
    statusId: 38,
    courseRoundGroupId: '',
    automatedWorkFlowJump: '',
    questions: emptyQuestions(),
  }));

  const [questionDraft, setQuestionDraft] = useState('');

  const selectedCourse: Course | undefined = useMemo(
    () => courses.find((c) => String(c.id) === String(selectedCourseId)),
    [courses, selectedCourseId]
  );

  const roundsForCourse = useMemo(
    () => rounds.filter((r) => String(r.courseId) === String(selectedCourseId)),
    [rounds, selectedCourseId]
  );

  const roundItemsForGroupSelect = useMemo(() => {
    if (!groupRootDetails) return [];

    const items: Array<{ id: number; label: string }> = [
      { id: groupRootDetails.id, label: `Round ${groupRootDetails.roundNumber}` },
    ];

    (groupRootDetails.groups ?? []).forEach((g) => {
      items.push({ id: g.id, label: `Round ${g.roundNumber}` });
    });

    return items;
  }, [groupRootDetails]);

  const loadRounds = useCallback(async () => {
    if (!selectedCourseId) return;
    try {
      setLoading(true);
      const all = await courseRoundApi.getAll();
      setRounds(all);
    } catch (e: any) {
      setRounds([]);
      setToast({ open: true, severity: 'error', message: e?.message || 'Failed to load course rounds' });
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId]);

  const loadInstructors = useCallback(async () => {
    try {
      const data = await accountApi.getInstructors();
      setInstructors(data);
    } catch {
      setInstructors([]);
    }
  }, []);

  const loadSelectedRoundDetails = useCallback(async () => {
    if (!selectedRoundId) {
      setSelectedRoundDetails(null);
      setGroupRootDetails(null);
      return;
    }

    try {
      const details = await courseRoundApi.getById(Number(selectedRoundId));
      setSelectedRoundDetails(details);

      if (details.courseRoundGroupId) {
        const root = await courseRoundApi.getById(Number(details.courseRoundGroupId));
        setGroupRootDetails(root);
      } else {
        setGroupRootDetails(details);
      }
    } catch {
      setSelectedRoundDetails(null);
      setGroupRootDetails(null);
    }
  }, [selectedRoundId]);

  const loadAssignedStudents = useCallback(async () => {
    if (!selectedRoundId) {
      setAssignedStudents([]);
      return;
    }

    try {
      const items = await courseRoundStudentApi.getByCourseRoundId(Number(selectedRoundId));
      setAssignedStudents(items);
    } catch {
      setAssignedStudents([]);
    }
  }, [selectedRoundId]);

  useEffect(() => {
    loadInstructors();
  }, [loadInstructors]);

  useEffect(() => {
    loadRounds();
  }, [loadRounds]);

  useEffect(() => {
    loadSelectedRoundDetails();
    loadAssignedStudents();
  }, [loadAssignedStudents, loadSelectedRoundDetails]);

  const openCreateRound = useCallback(() => {
    if (!selectedCourseId) return;

    const maxRoundNumber = roundsForCourse.reduce((acc, r) => (r.roundNumber > acc ? r.roundNumber : acc), 0);

    setForm({
      courseId: Number(selectedCourseId),
      roundNumber: maxRoundNumber + 1,
      startDate: '',
      endDate: '',
      minStudents: '',
      maxStudents: '',
      price: selectedCourse ? String(selectedCourse.price) : '',
      statusId: 38,
      courseRoundGroupId: '',
      automatedWorkFlowJump: '',
      questions: emptyQuestions(),
    });

    setQuestionDraft('');

    setRoundDialog({ open: true, mode: 'create' });
  }, [roundsForCourse, selectedCourse, selectedCourseId]);

  const openEditRound = useCallback(async () => {
    if (!selectedRoundId || !selectedCourseId) return;

    try {
      setLoading(true);
      const details = await courseRoundApi.getById(Number(selectedRoundId));
      setSelectedRoundDetails(details);

      setForm({
        courseId: Number(selectedCourseId),
        roundNumber: Number(details.roundNumber),
        startDate: details.startDate ?? '',
        endDate: details.endDate ?? '',
        minStudents: details.minStudents == null ? '' : String(details.minStudents),
        maxStudents: details.maxStudents == null ? '' : String(details.maxStudents),
        price: details.price == null ? '' : String(details.price),
        statusId: details.statusId ?? 38,
        courseRoundGroupId: details.courseRoundGroupId == null ? '' : String(details.courseRoundGroupId),
        automatedWorkFlowJump: details.automatedWorkFlowJump == null ? '' : String(details.automatedWorkFlowJump),
        questions: [
          details.question1 ?? '',
          details.question2 ?? '',
          details.question3 ?? '',
          details.question4 ?? '',
          details.question5 ?? '',
          details.question6 ?? '',
          details.question7 ?? '',
          details.question8 ?? '',
          details.question9 ?? '',
          details.question10 ?? '',
        ],
      });

      setQuestionDraft('');
      setRoundDialog({ open: true, mode: 'edit' });
    } catch (e: any) {
      setToast({ open: true, severity: 'error', message: e?.message || 'Failed to load round details' });
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId, selectedRoundId]);

  const openCreateGroupRound = useCallback(() => {
    if (!groupRootDetails || !selectedCourseId) return;

    const parentId = groupRootDetails.id;
    const baseRoundNumber = Number(groupRootDetails.roundNumber);
    const existingGroupsCount = groupRootDetails.groups?.length ?? 0;

    setForm({
      courseId: Number(selectedCourseId),
      roundNumber: buildRoundNumberForGroup(baseRoundNumber, existingGroupsCount),
      startDate: groupRootDetails.startDate ?? '',
      endDate: groupRootDetails.endDate ?? '',
      minStudents: groupRootDetails.minStudents == null ? '' : String(groupRootDetails.minStudents),
      maxStudents: groupRootDetails.maxStudents == null ? '' : String(groupRootDetails.maxStudents),
      price: groupRootDetails.price == null ? '' : String(groupRootDetails.price),
      statusId: 38,
      courseRoundGroupId: String(parentId),
      automatedWorkFlowJump: groupRootDetails.automatedWorkFlowJump == null ? '' : String(groupRootDetails.automatedWorkFlowJump),
      questions: [
        groupRootDetails.question1 ?? '',
        groupRootDetails.question2 ?? '',
        groupRootDetails.question3 ?? '',
        groupRootDetails.question4 ?? '',
        groupRootDetails.question5 ?? '',
        groupRootDetails.question6 ?? '',
        groupRootDetails.question7 ?? '',
        groupRootDetails.question8 ?? '',
        groupRootDetails.question9 ?? '',
        groupRootDetails.question10 ?? '',
      ],
    });

    setQuestionDraft('');

    setRoundDialog({ open: true, mode: 'create-group' });
  }, [groupRootDetails, selectedCourseId]);

  const saveRound = useCallback(async () => {
    if (!form.courseId || !form.roundNumber || !form.startDate || !form.endDate) return;

    const payloadQuestions = {
      question1: form.questions[0]?.trim() || '',
      question2: form.questions[1]?.trim() || '',
      question3: form.questions[2]?.trim() || '',
      question4: form.questions[3]?.trim() || '',
      question5: form.questions[4]?.trim() || '',
      question6: form.questions[5]?.trim() || '',
      question7: form.questions[6]?.trim() || '',
      question8: form.questions[7]?.trim() || '',
      question9: form.questions[8]?.trim() || '',
      question10: form.questions[9]?.trim() || '',
    };

    try {
      setLoading(true);

      if (roundDialog.mode === 'edit' && selectedRoundId) {
        await courseRoundApi.patch(Number(selectedRoundId), {
          courseId: form.courseId,
          roundNumber: Number(form.roundNumber),
          startDate: form.startDate,
          endDate: form.endDate,
          minStudents: form.minStudents === '' ? null : Number(form.minStudents),
          maxStudents: form.maxStudents === '' ? null : Number(form.maxStudents),
          price: form.price === '' ? null : Number(form.price),
          courseRoundGroupId: form.courseRoundGroupId === '' ? null : Number(form.courseRoundGroupId),
          statusId: form.statusId,
          ...payloadQuestions,
        });
        setToast({ open: true, severity: 'success', message: 'Round updated successfully' });
      } else {
        const created = await courseRoundApi.create({
          courseId: form.courseId,
          roundNumber: Number(form.roundNumber),
          startDate: form.startDate,
          endDate: form.endDate,
          minStudents: form.minStudents === '' ? null : Number(form.minStudents),
          maxStudents: form.maxStudents === '' ? null : Number(form.maxStudents),
          price: form.price === '' ? null : Number(form.price),
          courseRoundGroupId: form.courseRoundGroupId === '' ? null : Number(form.courseRoundGroupId),
          automatedWorkFlowJump: form.automatedWorkFlowJump === '' ? null : Number(form.automatedWorkFlowJump),
          ...payloadQuestions,
        });
        setToast({ open: true, severity: 'success', message: 'Round created successfully' });
        setSelectedRoundId(String(created.id));
      }

      setRoundDialog({ open: false, mode: 'create' });
      await loadRounds();
      await loadSelectedRoundDetails();
    } catch (e: any) {
      setToast({ open: true, severity: 'error', message: e?.message || 'Failed to save round' });
    } finally {
      setLoading(false);
    }
  }, [form, loadRounds, loadSelectedRoundDetails, roundDialog.mode, selectedRoundId]);

  const ensureGroupRoundIfFull = useCallback(async (): Promise<number | null> => {
    if (!groupRootDetails) return null;

    const max = groupRootDetails.maxStudents;
    if (max == null) return null;

    const currentCount = assignedStudents.length;
    if (currentCount < max) return null;

    const parentId = groupRootDetails.id;
    const baseRoundNumber = Number(groupRootDetails.roundNumber);
    const existingGroupsCount = groupRootDetails.groups?.length ?? 0;

    const created = await courseRoundApi.create({
      courseId: Number(groupRootDetails.courseId ?? form.courseId),
      roundNumber: buildRoundNumberForGroup(baseRoundNumber, existingGroupsCount),
      startDate: groupRootDetails.startDate ?? form.startDate,
      endDate: groupRootDetails.endDate ?? form.endDate,
      minStudents: groupRootDetails.minStudents == null ? null : Number(groupRootDetails.minStudents),
      maxStudents: groupRootDetails.maxStudents == null ? null : Number(groupRootDetails.maxStudents),
      price: groupRootDetails.price == null ? null : Number(groupRootDetails.price),
      courseRoundGroupId: parentId,
      automatedWorkFlowJump: groupRootDetails.automatedWorkFlowJump == null ? null : Number(groupRootDetails.automatedWorkFlowJump),
      question1: groupRootDetails.question1 ?? null,
      question2: groupRootDetails.question2 ?? null,
      question3: groupRootDetails.question3 ?? null,
      question4: groupRootDetails.question4 ?? null,
      question5: groupRootDetails.question5 ?? null,
      question6: groupRootDetails.question6 ?? null,
      question7: groupRootDetails.question7 ?? null,
      question8: groupRootDetails.question8 ?? null,
      question9: groupRootDetails.question9 ?? null,
      question10: groupRootDetails.question10 ?? null,
    });

    await loadRounds();
    await loadSelectedRoundDetails();
    return created.id;
  }, [assignedStudents.length, form.courseId, form.endDate, form.startDate, groupRootDetails, loadRounds, loadSelectedRoundDetails]);

  const handleAssignStudent = useCallback(async () => {
    if (!selectedRoundId || !assignStudentId) return;

    try {
      setLoading(true);

      const maybeNewGroupId = await ensureGroupRoundIfFull();
      const targetRoundId = maybeNewGroupId ? String(maybeNewGroupId) : selectedRoundId;

      await courseRoundStudentApi.assignStudent(Number(targetRoundId), { studentId: Number(assignStudentId) });

      setToast({ open: true, severity: 'success', message: 'Student assigned successfully' });
      setAssignStudentDialogOpen(false);
      setAssignStudentId('');
      if (targetRoundId !== selectedRoundId) setSelectedRoundId(targetRoundId);
      await loadAssignedStudents();
    } catch (e: any) {
      setToast({ open: true, severity: 'error', message: e?.message || 'Failed to assign student' });
    } finally {
      setLoading(false);
    }
  }, [assignStudentId, ensureGroupRoundIfFull, loadAssignedStudents, selectedRoundId]);

  const handleUnassignStudent = useCallback(
    async (assignmentId: number) => {
      if (!confirm('Are you sure you want to unassign this student?')) return;
      try {
        setLoading(true);
        await courseRoundStudentApi.unassignStudent(assignmentId);
        setToast({ open: true, severity: 'success', message: 'Student unassigned' });
        await loadAssignedStudents();
      } catch (e: any) {
        setToast({ open: true, severity: 'error', message: e?.message || 'Failed to unassign student' });
      } finally {
        setLoading(false);
      }
    },
    [loadAssignedStudents]
  );

  const handleAssignInstructors = useCallback(async () => {
    if (!selectedRoundId || selectedInstructorIds.length === 0) return;

    try {
      setLoading(true);
      await courseRoundInstructorApi.assignInstructors({
        courseRoundId: Number(selectedRoundId),
        instructorIds: selectedInstructorIds,
      });
      setToast({ open: true, severity: 'success', message: 'Instructors assigned successfully' });
      setAssignInstructorDialogOpen(false);
      setSelectedInstructorIds([]);
      await loadRounds();
      await loadSelectedRoundDetails();
    } catch (e: any) {
      setToast({ open: true, severity: 'error', message: e?.message || 'Failed to assign instructors' });
    } finally {
      setLoading(false);
    }
  }, [loadRounds, loadSelectedRoundDetails, selectedInstructorIds, selectedRoundId]);

  const openCourseRoomUrl = useMemo(() => {
    if (!selectedCourseId) return '';
    if (!selectedRoundId) return `/course-room/${selectedCourseId}`;
    return `/course-room/${selectedCourseId}?roundId=${selectedRoundId}`;
  }, [selectedCourseId, selectedRoundId]);

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
                <Iconify icon="solar:calendar-date-bold-duotone" width={32} />
              </Box>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -1 }}>
                  Engineer Course Rounds
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.9, fontWeight: 500 }}>
                  Manage rounds, groups, questions, instructors, and students in one control surface.
                </Typography>
              </Box>
            </Stack>
          </PageHeader>

          <GlassCard>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 280 }}>
                <InputLabel>Target Course</InputLabel>
                <Select
                  value={selectedCourseId}
                  label="Target Course"
                  onChange={(e) => {
                    setSelectedCourseId(String(e.target.value));
                    setSelectedRoundId('');
                  }}
                  sx={{ borderRadius: 1.5 }}
                >
                  {courses.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button 
                variant="outlined" 
                onClick={loadRounds} 
                disabled={!selectedCourseId || loading}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                Refresh
              </Button>

              <Button
                variant="contained"
                startIcon={<Iconify icon="solar:add-circle-bold-duotone" />}
                onClick={openCreateRound}
                disabled={!selectedCourseId}
                sx={{ borderRadius: 2, fontWeight: 800 }}
              >
                Create Round
              </Button>

              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:users-group-rounded-bold" />}
                onClick={openCreateGroupRound}
                disabled={!groupRootDetails}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                Create Group Round
              </Button>

              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:eye-bold" />}
                href={openCourseRoomUrl}
                disabled={!selectedCourseId}
                sx={{ borderRadius: 2, fontWeight: 700 }}
              >
                Open Course Room
              </Button>
            </Box>
          </GlassCard>

          {!selectedCourseId && <Alert severity="info" variant="outlined" sx={{ borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.05) }}>Select a course to manage its rounds.</Alert>}

          {selectedCourseId && roundsForCourse.length === 0 && !loading && (
            <Alert severity="info" variant="outlined" sx={{ borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.05) }}>No rounds found for this course.</Alert>
          )}

          {roundItemsForGroupSelect.length > 0 && (
            <GlassCard>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                  ACTIVE SELECTION:
                </Typography>
                <FormControl size="small" sx={{ minWidth: 260 }}>
                  <InputLabel>Round / Group</InputLabel>
                  <Select
                    value={selectedRoundId}
                    label="Round / Group"
                    onChange={(e) => setSelectedRoundId(String(e.target.value))}
                    sx={{ borderRadius: 1.5 }}
                  >
                    {roundItemsForGroupSelect.map((item) => (
                      <MenuItem key={item.id} value={String(item.id)}>
                        {item.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selectedRoundDetails?.instructorName && (
                  <Chip
                    icon={<Iconify icon="solar:user-id-bold" width={16} />}
                    label={`Instructor: ${selectedRoundDetails.instructorName}`}
                    variant="filled"
                    color="primary"
                    sx={{ borderRadius: 1 }}
                  />
                )}

                <Button
                  variant="outlined"
                  startIcon={<Iconify icon="solar:pen-new-square-bold" />}
                  onClick={openEditRound}
                  disabled={!selectedRoundDetails}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  Edit Round
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<Iconify icon="solar:users-group-rounded-bold" />}
                  onClick={() => setAssignInstructorDialogOpen(true)}
                  disabled={!selectedRoundId}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  Assign Instructors
                </Button>

                <Button
                  variant="contained"
                  startIcon={<Iconify icon="solar:user-plus-bold" />}
                  onClick={() => setAssignStudentDialogOpen(true)}
                  disabled={!selectedRoundId}
                  sx={{ borderRadius: 2, fontWeight: 800 }}
                >
                  Assign Student
                </Button>
              </Box>
            </GlassCard>
          )}

          {selectedCourseId && roundsForCourse.length > 0 && (
            <Grid container spacing={2}>
              {roundsForCourse
                .slice()
                .sort((a, b) => a.roundNumber - b.roundNumber)
                .map((r) => (
                  <Grid key={r.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <EngineeringFrame
                      onClick={() => setSelectedRoundId(String(r.id))}
                      sx={{
                        cursor: 'pointer',
                        borderColor: String(r.id) === String(selectedRoundId) ? 'primary.main' : undefined,
                        boxShadow: String(r.id) === String(selectedRoundId) ? `0 0 0 2px ${theme.palette.primary.main}` : undefined,
                        p: 0,
                        overflow: 'hidden'
                      }}
                    >
                      <Box sx={{ p: 2.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                             <GradientIcon sx={{ width: 40, height: 40, borderRadius: 1.5 }}>
                                <Iconify icon="solar:stopwatch-bold" width={20} />
                             </GradientIcon>
                             <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                  Round {r.roundNumber}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                  ID: {r.id}
                                </Typography>
                             </Box>
                          </Stack>
                          {r.courseRoundGroupId ? (
                            <Chip label="Group" size="small" color="info" sx={{ fontWeight: 800, borderRadius: 1 }} />
                          ) : (
                            <Chip label="Main" size="small" variant="outlined" sx={{ fontWeight: 800, borderRadius: 1 }} />
                          )}
                        </Box>
                        <Stack spacing={1} sx={{ mt: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                             <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>TIMEFRAME</Typography>
                             <Typography variant="caption" sx={{ fontWeight: 700 }}>{r.startDate} — {r.endDate}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                             <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>STATUS</Typography>
                             <Chip 
                              label={r.status ?? String(r.statusId ?? '')} 
                              size="small" 
                              sx={{ height: 20, fontSize: 10, fontWeight: 900 }} 
                              color={r.status === 'Active' ? 'success' : 'default'}
                             />
                          </Box>
                        </Stack>
                      </Box>
                    </EngineeringFrame>
                  </Grid>
                ))}
            </Grid>
          )}

          {selectedRoundId && (
            <EngineeringFrame sx={{ p: 0 }}>
              <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Assigned Students ({assignedStudents.length})
                </Typography>
              </Box>

              {assignedStudents.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                   <Typography variant="body2" sx={{ color: 'text.secondary' }}>No students assigned to this round.</Typography>
                </Box>
              ) : (
                <Stack spacing={0}>
                  {assignedStudents.map((s) => (
                    <Box 
                      key={s.id} 
                      sx={{ 
                          p: 2, 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          borderBottom: '1px solid', 
                          borderColor: 'divider',
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) }
                      }}
                    >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: alpha(theme.palette.common.white, 0.05), display: 'grid', placeItems: 'center', fontWeight: 900 }}>
                            {s.studentName?.charAt(0) || 'S'}
                          </Box>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                              {s.studentName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {s.studentEmail}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Assigned: {s.assignedAt}
                            </Typography>
                          </Box>
                        </Stack>
                        <Button color="error" variant="outlined" size="small" onClick={() => handleUnassignStudent(s.id)} sx={{ fontWeight: 800, borderRadius: 1 }}>
                          Unassign
                        </Button>
                    </Box>
                  ))}
                </Stack>
              )}
            </EngineeringFrame>
          )}

          <Dialog
            open={roundDialog.open}
            onClose={() => {
              setRoundDialog({ open: false, mode: 'create' });
              setQuestionDraft('');
            }}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              {roundDialog.mode === 'edit'
                ? 'Edit Round'
                : roundDialog.mode === 'create-group'
                  ? 'Create Group Round'
                  : 'Create Round'}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
                <TextField
                  label="Round Number"
                  type="number"
                  value={form.roundNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, roundNumber: Number(e.target.value) }))}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={form.statusId}
                    onChange={(e) => setForm((prev) => ({ ...prev, statusId: Number(e.target.value) }))}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Start Date"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                   label="Min Students"
                   type="number"
                   value={form.minStudents}
                   onChange={(e) => setForm((prev) => ({ ...prev, minStudents: e.target.value }))}
                   fullWidth
                 />
                 <TextField
                   label="Max Students"
                   type="number"
                   value={form.maxStudents}
                   onChange={(e) => setForm((prev) => ({ ...prev, maxStudents: e.target.value }))}
                   fullWidth
                 />
 
                 <TextField
                   label="Price"
                   type="number"
                   value={form.price}
                   onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                   fullWidth
                 />
                 <TextField
                   label="Automated Workflow Jump"
                   type="number"
                   value={form.automatedWorkFlowJump}
                   onChange={(e) => setForm((prev) => ({ ...prev, automatedWorkFlowJump: e.target.value }))}
                   fullWidth
                 />
 
                 <TextField
                   label="Course Round Group Id"
                   type="number"
                   value={form.courseRoundGroupId}
                   onChange={(e) => setForm((prev) => ({ ...prev, courseRoundGroupId: e.target.value }))}
                   fullWidth
                 />
               </Box>
 
               <Divider sx={{ my: 3 }} />
 
               <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                 Questions
               </Typography>
 
               <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mb: 2, flexWrap: 'wrap' }}>
                 <TextField
                   label="Write a question"
                   value={questionDraft}
                   onChange={(e) => setQuestionDraft(e.target.value)}
                   fullWidth
                   multiline
                   minRows={2}
                   sx={{ flex: 1, minWidth: { xs: '100%', md: 420 } }}
                 />
                 <Button
                   variant="contained"
                   onClick={() => {
                     const text = questionDraft.trim();
                     if (!text) return;
                     setForm((prev) => {
                       const idx = prev.questions.findIndex((x) => !x.trim());
                       if (idx === -1) return prev;
                       const next = prev.questions.slice();
                       next[idx] = text;
                       return { ...prev, questions: next };
                     });
                     setQuestionDraft('');
                   }}
                   disabled={!questionDraft.trim() || form.questions.every((q) => q.trim())}
                   sx={{ height: 56, px: 3, fontWeight: 800, borderRadius: 2 }}
                 >
                   Add
                 </Button>
               </Box>
 
               {form.questions.some((q) => q.trim()) ? (
                 <Stack spacing={2}>
                   {form.questions
                     .map((q, idx) => ({ idx, q }))
                     .filter((x) => x.q.trim())
                     .map(({ idx, q }) => (
                       <TextField
                         key={idx}
                         label={`Question ${idx + 1}`}
                         value={q}
                         onChange={(e) =>
                           setForm((prev) => {
                             const next = prev.questions.slice();
                             next[idx] = e.target.value;
                             return { ...prev, questions: next };
                           })
                         }
                         fullWidth
                         multiline
                         minRows={2}
                         InputProps={{
                           endAdornment: (
                             <IconButton
                               aria-label="Remove question"
                               size="small"
                               onClick={() =>
                                 setForm((prev) => {
                                   const next = prev.questions.slice();
                                   next[idx] = '';
                                   return { ...prev, questions: next };
                                 })
                               }
                             >
                               <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                             </IconButton>
                           ),
                         }}
                       />
                     ))}
                 </Stack>
               ) : (
                 <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                   No questions yet. Add the first question above.
                 </Alert>
               )}
             </DialogContent>
             <DialogActions>
               <Button onClick={() => setRoundDialog({ open: false, mode: 'create' })}>Cancel</Button>
               <Button variant="contained" onClick={saveRound} disabled={loading || !form.startDate || !form.endDate}>
                 Save
               </Button>
             </DialogActions>
           </Dialog>
 
           <Dialog
             open={assignStudentDialogOpen}
             onClose={() => setAssignStudentDialogOpen(false)}
             maxWidth="sm"
             fullWidth
             fullScreen={isMobile}
           >
             <DialogTitle>Assign Student</DialogTitle>
             <DialogContent>
               <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                 <TextField
                   label="Student ID"
                   type="number"
                   value={assignStudentId}
                   onChange={(e) => setAssignStudentId(e.target.value)}
                   fullWidth
                 />
                 {groupRootDetails?.maxStudents != null && (
                   <Alert severity="info">
                     If the current round reaches its max capacity, a new group round will be created automatically.
                   </Alert>
                 )}
               </Box>
             </DialogContent>
             <DialogActions>
               <Button onClick={() => setAssignStudentDialogOpen(false)}>Cancel</Button>
               <Button variant="contained" onClick={handleAssignStudent} disabled={!assignStudentId || loading}>
                 Assign
               </Button>
             </DialogActions>
           </Dialog>
 
           <Dialog
             open={assignInstructorDialogOpen}
             onClose={() => setAssignInstructorDialogOpen(false)}
             maxWidth="sm"
             fullWidth
             fullScreen={isMobile}
           >
             <DialogTitle>Assign Instructors</DialogTitle>
             <DialogContent>
               <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                 <FormControl fullWidth>
                   <InputLabel>Instructors</InputLabel>
                   <Select
                     multiple
                     label="Instructors"
                     value={selectedInstructorIds}
                     onChange={(e) => {
                       const val = e.target.value as number[];
                       setSelectedInstructorIds(val);
                     }}
                     renderValue={(selected) =>
                       instructors
                         .filter((i) => selected.includes(i.id))
                         .map((i) => i.fullName)
                         .join(', ')
                     }
                   >
                     {instructors.map((i) => (
                       <MenuItem key={i.id} value={i.id}>
                         {i.fullName} ({i.email})
                       </MenuItem>
                     ))}
                   </Select>
                 </FormControl>
                 <Alert severity="info">Assigning instructors replaces existing assignments for this round.</Alert>
               </Box>
             </DialogContent>
             <DialogActions>
               <Button onClick={() => setAssignInstructorDialogOpen(false)}>Cancel</Button>
               <Button
                 variant="contained"
                 onClick={handleAssignInstructors}
                 disabled={selectedInstructorIds.length === 0 || loading || !selectedRoundId}
               >
                 Save
               </Button>
             </DialogActions>
           </Dialog>
 
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
         </Stack>
       </Container>
     </DashboardContent>
   );
 }
