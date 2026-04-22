import type { MaterialDto } from 'src/api/models/material';
import type { CourseRoundStudentDto } from 'src/api/models/course-round-student';
import type { InstructorCourseRoundDto } from 'src/api/models/course-round-instructor';

import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Tab,
  Card,
  Chip,
  Grid,
  List,
  Tabs,
  Alert,
  Button,
  Dialog,
  Select,
  MenuItem,
  Snackbar,
  TextField,
  IconButton,
  InputLabel,
  Typography,
  CardContent,
  DialogTitle,
  FormControl,
  ListItemText,
  DialogActions,
  DialogContent,
  ListItemButton,
} from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';
import { useAuth } from 'src/contexts/simple-auth-context';
import {
  materialApi,
  courseRoundApi,
  courseMaterialApi,
  courseRoundStudentApi,
  courseRoundInstructorApi,
} from 'src/api';

import { Iconify } from 'src/components/iconify';
import { ZoomMeetingViewer } from 'src/components/zoom-meeting-viewer';

const toPrettyDate = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
};

export function InstructorRoundsView() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rounds, setRounds] = useState<InstructorCourseRoundDto[]>([]);
  const [selectedRound, setSelectedRound] = useState<InstructorCourseRoundDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [weeks, setWeeks] = useState<{ id: number; title: string }[]>([]);
  const [students, setStudents] = useState<CourseRoundStudentDto[]>([]);

  const [createMeetingOpen, setCreateMeetingOpen] = useState(false);
  const [createMaterialOpen, setCreateMaterialOpen] = useState(false);

  const [meetingForm, setMeetingForm] = useState({
    topic: '',
    description: '',
    meetingLink: '',
    meetingId: '',
    passcode: '',
    meetingDateTime: '',
    durationMinutes: 60,
  });

  const [materialForm, setMaterialForm] = useState({
    title: '',
    description: '',
    content: '',
    weekId: 0,
    materialTypeStatusId: 1,
    link: '',
  });

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity?: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const loadRounds = async () => {
      if (!user?.id) return;
      try {
        const instructorId = Number(user.id);
        const data = await courseRoundInstructorApi.getByInstructorId(instructorId);
        setRounds(data);
      } catch (error) {
        console.error('Failed to load instructor rounds:', error);
      } finally {
        setLoading(false);
      }
    };
    loadRounds();
  }, [user?.id]);

  const loadRoundDetails = useCallback(async (round: InstructorCourseRoundDto) => {
    try {
      const [materialsData, weeksData, studentsData] = await Promise.all([
        materialApi.getByCourseRoundId(round.courseRoundId),
        courseRoundApi
          .getById(round.courseRoundId)
          .then((r) => r.weekTitles?.map((title, idx) => ({ id: idx + 1, title })) || []),
        courseRoundStudentApi.getByCourseRoundId(round.courseRoundId),
      ]);
      setMaterials(materialsData);
      setWeeks(weeksData);
      setStudents(studentsData);
    } catch (error) {
      console.error('Failed to load round details:', error);
    }
  }, []);

  const handleSelectRound = useCallback((round: InstructorCourseRoundDto) => {
    setSelectedRound(round);
    loadRoundDetails(round);
    setTab(0);
  }, [loadRoundDetails]);

  const handleCreateMeeting = async () => {
    if (!selectedRound || !user?.id) return;
    try {
      await courseMaterialApi.createZoom({
        courseRoundId: selectedRound.courseRoundId,
        createdByAccountId: Number(user.id),
        weekId: 0,
        title: meetingForm.topic,
        description: meetingForm.description,
        startTimeUtc: new Date(meetingForm.meetingDateTime).toISOString(),
        durationMinutes: meetingForm.durationMinutes,
      });
      setCreateMeetingOpen(false);
      setMeetingForm({
        topic: '',
        description: '',
        meetingLink: '',
        meetingId: '',
        passcode: '',
        meetingDateTime: '',
        durationMinutes: 60,
      });
      setSnackbar({ open: true, message: 'Zoom meeting created successfully.', severity: 'success' });
      loadRoundDetails(selectedRound);
    } catch (error: any) {
      const msg = error?.message || 'Failed to create meeting. Check that Zoom credentials are configured.';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleCreateMaterial = async () => {
    if (!selectedRound) return;
    try {
      await materialApi.create({
        courseRoundId: selectedRound.courseRoundId,
        ...materialForm,
        weekId: materialForm.weekId || undefined,
      });
      setCreateMaterialOpen(false);
      setMaterialForm({
        title: '',
        description: '',
        content: '',
        weekId: 0,
        materialTypeStatusId: 1,
        link: '',
      });
      loadRoundDetails(selectedRound);
    } catch (error) {
      console.error('Failed to create material:', error);
      alert('Failed to create material');
    }
  };

  const [selectedMeeting, setSelectedMeeting] = useState<MaterialDto | null>(null);

  if (loading) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Typography>Loading...</Typography>
        </Box>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          {t('instructor.myRounds')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('instructor.myRoundsDescription')}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                {t('instructor.assignedRounds')}
              </Typography>
              {rounds.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Iconify icon="solar:book-2-bold" width={48} sx={{ color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">{t('instructor.noRoundsAssigned')}</Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {rounds.map((round) => (
                    <ListItemButton
                      key={round.courseRoundId}
                      selected={selectedRound?.courseRoundId === round.courseRoundId}
                      onClick={() => handleSelectRound(round)}
                      sx={{
                        borderRadius: 1,
                        mb: 1,
                        '&.Mui-selected': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                      }}
                    >
                      <ListItemText
                        primary={round.courseName}
                        secondary={`Round ${round.roundNumber}`}
                      />
                      <Chip
                        label={round.startDate ? 'Assigned' : 'Unknown'}
                        color={round.startDate ? 'success' : 'default'}
                        size="small"
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          {selectedRound ? (
            <Card sx={{ borderRadius: 2 }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                  <Tab label={t('instructor.overview')} icon={<Iconify icon="solar:info-circle-bold" />} iconPosition="start" />
                  <Tab label={t('instructor.students')} icon={<Iconify icon="solar:users-bold" />} iconPosition="start" />
                  <Tab label={t('instructor.meetings')} icon={<Iconify icon="solar:video-bold" />} iconPosition="start" />
                  <Tab label={t('instructor.materials')} icon={<Iconify icon="solar:document-bold" />} iconPosition="start" />
                </Tabs>
              </Box>

              <CardContent>
                {tab === 0 && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {selectedRound.courseName}
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Iconify icon="solar:door-open-bold" />}
                        onClick={() => navigate(`/course-room/${selectedRound.courseRoundId}`)}
                      >
                        {t('instructor.openCourseRoom')}
                      </Button>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Card variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
                            {selectedRound.roundNumber}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('instructor.roundNumber')}
                          </Typography>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Card variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 800, color: 'success.main' }}>
                            {materials.filter((m) => m.materialTypeStatusId === 34).length}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('instructor.meetings')}
                          </Typography>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Card variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 800, color: 'warning.main' }}>
                            {materials.length}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('instructor.materials')}
                          </Typography>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Card variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                          <Typography variant="h4" sx={{ fontWeight: 800, color: 'info.main' }}>
                            {selectedRound.price || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('instructor.price')}
                          </Typography>
                        </Card>
                      </Grid>
                    </Grid>
                    {selectedRound.startDate && selectedRound.endDate && (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {t('instructor.duration')}
                        </Typography>
                        <Typography color="text.secondary">
                          {toPrettyDate(selectedRound.startDate)} - {toPrettyDate(selectedRound.endDate)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}

                {tab === 1 && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {t('instructor.students')}
                      </Typography>
                      <Chip label={`${students.length} ${t('instructor.students').toLowerCase()}`} color="primary" />
                    </Box>
                    {students.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Iconify icon="solar:users-bold" width={48} sx={{ color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary">{t('instructor.noStudents')}</Typography>
                      </Box>
                    ) : (
                      <List>
                        {students.map((student) => (
                          <Card key={student.id} variant="outlined" sx={{ mb: 1, p: 2, borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  {student.studentName || 'Student'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {student.studentEmail || 'No email'}
                                </Typography>
                              </Box>
                              <Chip
                                label={student.isActive ? 'Active' : 'Inactive'}
                                color={student.isActive ? 'success' : 'default'}
                                size="small"
                              />
                            </Box>
                          </Card>
                        ))}
                      </List>
                    )}
                  </Box>
                )}

                {tab === 2 && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {t('instructor.meetings')}
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<Iconify icon="solar:add-circle-bold" />}
                        onClick={() => setCreateMeetingOpen(true)}
                      >
                        {t('instructor.createMeeting')}
                      </Button>
                    </Box>
                    {materials.filter((m) => m.materialTypeStatusId === 34).length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Iconify icon="solar:video-bold" width={48} sx={{ color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary">{t('instructor.noMeetings')}</Typography>
                      </Box>
                    ) : (
                      <List>
                        {materials
                          .filter((m) => m.materialTypeStatusId === 34)
                          .map((meeting) => (
                          <Card key={meeting.id} variant="outlined" sx={{ mb: 1, p: 2, borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  {meeting.title}
                                </Typography>
                                {meeting.description && (
                                  <Typography variant="body2" sx={{ mt: 1 }}>
                                    {meeting.description}
                                  </Typography>
                                )}
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  variant="contained"
                                  color="primary"
                                  startIcon={<Iconify icon="solar:video-bold" />}
                                  onClick={() => setSelectedMeeting(meeting)}
                                >
                                  {t('instructor.join')}
                                </Button>
                                {meeting.meetingId && (
                                  <Chip
                                    label={`ID: ${meeting.meetingId}`}
                                    size="small"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            </Box>
                          </Card>
                        ))}
                      </List>
                    )}
                  </Box>
                )}

                {tab === 3 && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {t('instructor.materials')}
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<Iconify icon="solar:add-circle-bold" />}
                        onClick={() => setCreateMaterialOpen(true)}
                      >
                        {t('instructor.addMaterial')}
                      </Button>
                    </Box>
                    {materials.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Iconify icon="solar:document-bold" width={48} sx={{ color: 'text.disabled', mb: 1 }} />
                        <Typography color="text.secondary">{t('instructor.noMaterials')}</Typography>
                      </Box>
                    ) : (
                      <List>
                        {materials.map((material) => (
                          <Card key={material.id} variant="outlined" sx={{ mb: 1, p: 2, borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  {material.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {material.materialTypeStatusId === 1 ? 'Video' : material.materialTypeStatusId === 2 ? 'Document' : 'Material'}
                                </Typography>
                                {material.description && (
                                  <Typography variant="body2" sx={{ mt: 1 }}>
                                    {material.description}
                                  </Typography>
                                )}
                              </Box>
                              {material.link && (
                                <IconButton
                                  component="a"
                                  href={material.link}
                                  target="_blank"
                                  color="primary"
                                >
                                  <Iconify icon="solar:download-bold" />
                                </IconButton>
                              )}
                            </Box>
                          </Card>
                        ))}
                      </List>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card sx={{ borderRadius: 2, p: 4, textAlign: 'center' }}>
              <Iconify icon="solar:book-2-bold" width={64} sx={{ color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                {t('instructor.selectRound')}
              </Typography>
            </Card>
          )}
        </Grid>
      </Grid>

      <Dialog open={createMeetingOpen} onClose={() => setCreateMeetingOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('instructor.createMeeting')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('instructor.topic')}
              value={meetingForm.topic}
              onChange={(e) => setMeetingForm({ ...meetingForm, topic: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('instructor.description')}
              value={meetingForm.description}
              onChange={(e) => setMeetingForm({ ...meetingForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label={t('instructor.meetingLink')}
              value={meetingForm.meetingLink}
              onChange={(e) => setMeetingForm({ ...meetingForm, meetingLink: e.target.value })}
              fullWidth
              placeholder="https://zoom.us/j/..."
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label={t('instructor.meetingId')}
                value={meetingForm.meetingId}
                onChange={(e) => setMeetingForm({ ...meetingForm, meetingId: e.target.value })}
              />
              <TextField
                label={t('instructor.passcode')}
                value={meetingForm.passcode}
                onChange={(e) => setMeetingForm({ ...meetingForm, passcode: e.target.value })}
              />
            </Box>
            <TextField
              label={t('instructor.dateTime')}
              type="datetime-local"
              value={meetingForm.meetingDateTime}
              onChange={(e) => setMeetingForm({ ...meetingForm, meetingDateTime: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label={t('instructor.duration')}
              type="number"
              value={meetingForm.durationMinutes}
              onChange={(e) => setMeetingForm({ ...meetingForm, durationMinutes: Number(e.target.value) })}
              fullWidth
              InputProps={{ inputProps: { min: 15, max: 180 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateMeetingOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleCreateMeeting} disabled={!meetingForm.topic || !meetingForm.meetingDateTime}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createMaterialOpen} onClose={() => setCreateMaterialOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('instructor.addMaterial')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('instructor.title')}
              value={materialForm.title}
              onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
              fullWidth
            />
            <TextField
              label={t('instructor.description')}
              value={materialForm.description}
              onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>{t('instructor.week')}</InputLabel>
              <Select
                value={materialForm.weekId}
                label={t('instructor.week')}
                onChange={(e) => setMaterialForm({ ...materialForm, weekId: Number(e.target.value) })}
              >
                <MenuItem value={0}>-</MenuItem>
                {weeks.map((week) => (
                  <MenuItem key={week.id} value={week.id}>
                    {week.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t('instructor.content')}
              value={materialForm.content}
              onChange={(e) => setMaterialForm({ ...materialForm, content: e.target.value })}
              fullWidth
              multiline
              rows={4}
            />
            <TextField
              label={t('instructor.link')}
              value={materialForm.link}
              onChange={(e) => setMaterialForm({ ...materialForm, link: e.target.value })}
              fullWidth
              placeholder="https://..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateMaterialOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleCreateMaterial} disabled={!materialForm.title}>
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
      <ZoomMeetingViewer
        meeting={selectedMeeting}
        open={!!selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
        isHost
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}
