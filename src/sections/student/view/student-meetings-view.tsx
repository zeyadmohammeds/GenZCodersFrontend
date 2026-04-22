import type { MaterialDto } from 'src/api/models/material';

import { useTranslation } from 'react-i18next';
import { useMemo, useState, useEffect } from 'react';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Card,
  Chip,
  List,
  Button,
  Avatar,
  Typography,
  CardContent,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
} from '@mui/material';

import { courseMaterialApi } from 'src/api';
import { DashboardContent } from 'src/layouts/dashboard';
import { useAuth } from 'src/contexts/simple-auth-context';
import { useCoursesContext } from 'src/contexts/courses-context';
import { useApplicationsContext } from 'src/contexts/applications-context';
import { useCourseRoundsContext } from 'src/contexts/course-rounds-context';

import { Iconify } from 'src/components/iconify';
import { ZoomMeetingViewer } from 'src/components/zoom-meeting-viewer';

export function StudentMeetingsView() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { hasRole } = useAuth();
  const { applications } = useApplicationsContext();
  const { getRoundById } = useCourseRoundsContext();
  const { courses } = useCoursesContext();

  const [meetings, setMeetings] = useState<MaterialDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<MaterialDto | null>(null);

  const studentCourseRoundIds = useMemo(
    () => applications.filter((app) => app.status === 'accepted').map((app) => app.courseRoundId),
    [applications]
  );

  useEffect(() => {
    const loadMeetings = async () => {
      if (studentCourseRoundIds.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const allMeetings: MaterialDto[] = [];
        for (const roundId of studentCourseRoundIds) {
          if (!roundId) continue;
          try {
            const roundMaterials = await courseMaterialApi.getByCourseRoundId(roundId);
            const zoomMaterials = roundMaterials.filter((m) => m.materialTypeStatusId === 34);
            allMeetings.push(...zoomMaterials);
          } catch {
            // Skip if fails
          }
        }
        setMeetings(allMeetings);
      } catch (error) {
        console.error('Failed to load meetings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadMeetings();
  }, [studentCourseRoundIds]);

  const meetingsWithCourseInfo = useMemo(
    () =>
      meetings.map((meeting) => {
        const round = getRoundById(String(meeting.courseRoundId));
        const course = courses.find((c) => c.id === round?.courseId);
        return {
          ...meeting,
          courseName: course?.name || round?.name || 'Course',
          roundNumber: round?.roundNumber || 0,
        };
      }),
    [meetings, getRoundById, courses]
  );

  const handleJoinMeeting = (meeting: MaterialDto) => {
    setSelectedMeeting(meeting);
  };

  if (!hasRole('student')) {
    return (
      <DashboardContent>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            This page is only available for students
          </Typography>
        </Box>
      </DashboardContent>
    );
  }

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
      <Box
        sx={{
          mb: 4,
          p: { xs: 3, md: 5 },
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(at 0% 0%, ${alpha(theme.palette.secondary.dark, 0.8)} 0px, transparent 50%),
                         radial-gradient(at 100% 0%, ${alpha(theme.palette.primary.main, 0.9)} 0px, transparent 50%),
                         radial-gradient(at 100% 100%, ${alpha(theme.palette.info.main, 0.8)} 0px, transparent 50%),
                         linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)`,
            zIndex: 0,
          }}
        />
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography
            variant="h3"
            sx={{ fontWeight: 800, mb: 1, textShadow: '0 4px 12px rgba(0,0,0,0.3)', color: 'white' }}
          >
            {t('student.myMeetings')}
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.9, fontSize: '1.1rem', fontWeight: 500, color: 'white' }}>
            {t('student.myMeetingsDescription')}
          </Typography>
        </Box>
      </Box>

      <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>
          {meetingsWithCourseInfo.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Iconify
                icon="solar:video-bold"
                width={64}
                sx={{ color: 'text.disabled', mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary">
                {t('student.noUpcomingMeetings')}
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                {t('student.noUpcomingMeetingsDesc')}
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {meetingsWithCourseInfo.map((meeting, index) => (
                <ListItemButton
                  key={meeting.id}
                  sx={{
                    py: 2.5,
                    px: 3,
                    borderBottom: index < meetingsWithCourseInfo.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                        width: 56,
                        height: 56,
                      }}
                    >
                      <Iconify icon="solar:video-bold" width={28} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                        {meeting.title}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {meeting.courseName} • Round {meeting.roundNumber}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                          {/* No schedule data stored for ZoomLink materials at the moment */}
                          {meeting.meetingId && (
                            <Chip label={`ID: ${meeting.meetingId}`} size="small" variant="outlined" />
                          )}
                        </Box>
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                    {meeting.description && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          maxWidth: 200,
                          textAlign: 'right',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {meeting.description}
                      </Typography>
                    )}
                    <Button
                      variant="contained"
                      startIcon={<Iconify icon="solar:video-bold" />}
                      onClick={() => handleJoinMeeting(meeting)}
                      sx={{ borderRadius: 2 }}
                    >
                      {t('student.join')}
                    </Button>
                  </Box>
                </ListItemButton>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      <ZoomMeetingViewer
        meeting={selectedMeeting}
        open={!!selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
      />
    </DashboardContent>
  );
}
