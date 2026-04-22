import type { ApexOptions } from 'apexcharts';
import type { InstructorCourseRoundDto } from 'src/api/models/course-round-instructor';

import Chart from 'react-apexcharts';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import { alpha, useTheme } from '@mui/material/styles';

import { courseRoundInstructorApi } from 'src/api';
import { DashboardContent } from 'src/layouts/dashboard';
import { useAuth } from 'src/contexts/simple-auth-context';
import { useCoursesContext } from 'src/contexts/courses-context';
import { useCourseRoundsContext } from 'src/contexts/course-rounds-context';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const INSTRUCTOR_VISIBLE_STATUS_IDS = new Set([19, 20, 21, 38]);

const normalizeStatusName = (value: string | undefined) => (value ?? '').trim().toLowerCase();

const isInstructorVisibleStatusName = (value: string | undefined) => {
  const lower = normalizeStatusName(value);
  return (
    lower.includes('cancel') ||
    lower.includes('active') ||
    lower.includes('scheduled') ||
    lower.includes('complete') ||
    lower.includes('finish')
  );
};

const premiumGlass = (theme: any) => ({
  background: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(20px)',
  border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
  boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.05)}`,
  borderRadius: 3,
});

export function InstructorDashboardView() {
  const { user } = useAuth();
  const theme = useTheme();

  const { courses } = useCoursesContext();
  const { rounds } = useCourseRoundsContext();

  const [assignedRounds, setAssignedRounds] = useState<InstructorCourseRoundDto[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadAssigned = async () => {
      const myId = Number(user?.id);
      if (!Number.isFinite(myId) || myId <= 0) {
        if (!cancelled) setAssignedRounds([]);
        return;
      }

      try {
        const data = await courseRoundInstructorApi.getByInstructorId(myId);
        if (!cancelled) setAssignedRounds(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setAssignedRounds([]);
      }
    };

    loadAssigned();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const instructorCourses = useMemo(() => {
    const myId = user?.id;
    if (!myId) return [];
    if (assignedRounds.length > 0) {
      const names = new Set(assignedRounds.map((r) => r.courseName));
      return courses.filter((c) => names.has(c.name));
    }
    return courses.filter((c) => c.instructorId === myId);
  }, [assignedRounds, courses, user?.id]);

  const totalStudents = useMemo(
    () => instructorCourses.reduce((acc, c) => acc + (Number.isFinite(c.students) ? c.students : 0), 0),
    [instructorCourses]
  );

  const avgCourseRating = useMemo(() => {
    if (instructorCourses.length === 0) return 0;
    const sum = instructorCourses.reduce((acc, c) => acc + (Number.isFinite(c.rating) ? c.rating : 0), 0);
    return Math.round((sum / instructorCourses.length) * 10) / 10;
  }, [instructorCourses]);

  const myCourses = useMemo(
    () =>
      instructorCourses.map((c) => ({
        id: c.id,
        title: c.name,
        students: c.students,
        pendingAssignments: 0,
        avgGrade: '—',
      })),
    [instructorCourses]
  );

  const myCourseRounds = useMemo(() => {
    const myId = user?.id;
    if (!myId) return [];

    if (assignedRounds.length > 0) {
      const allowedIds = new Set(assignedRounds.map((r) => String(r.courseRoundId)));
      const rows = rounds
        .filter((round) => allowedIds.has(String(round.id)))
        .filter((round) =>
          typeof round.statusName === 'string' && round.statusName.trim() !== ''
            ? isInstructorVisibleStatusName(round.statusName)
            : round.statusId != null
              ? INSTRUCTOR_VISIBLE_STATUS_IDS.has(round.statusId)
              : false
        )
        .map((round) => {
          const course = courses.find((c) => c.id === round.courseId);
          return {
            ...round,
            courseTitle: course?.name ?? `Course ${round.courseId}`,
          };
        });

      return rows.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }

    const rows = rounds
      .filter((round) => round.createdBy === myId)
      .filter((round) =>
        typeof round.statusName === 'string' && round.statusName.trim() !== ''
          ? isInstructorVisibleStatusName(round.statusName)
          : round.statusId != null
            ? INSTRUCTOR_VISIBLE_STATUS_IDS.has(round.statusId)
            : false
      )
      .map((round) => {
        const course = courses.find((c) => c.id === round.courseId);
        return {
          ...round,
          courseTitle: course?.name ?? `Course ${round.courseId}`,
        };
      });

    return rows.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [assignedRounds, courses, rounds, user?.id]);

  const statsCards = [
    {
      title: 'Total Students',
      value: totalStudents,
      icon: 'solar:users-bold-duotone',
      color: theme.palette.primary.main,
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.primary.lighter, 0.8)} 0%, ${alpha(theme.palette.primary.light, 0.9)} 100%)`,
      textColor: theme.palette.primary.darker,
      trend: `${totalStudents > 0 ? '+' : ''}${Math.round(totalStudents * 0.1)} this week`,
    },
    {
      title: 'My Courses',
      value: instructorCourses.length,
      icon: 'solar:book-2-bold-duotone',
      color: theme.palette.secondary.main,
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.secondary.lighter, 0.8)} 0%, ${alpha(theme.palette.secondary.light, 0.9)} 100%)`,
      textColor: theme.palette.secondary.darker,
      trend: `${instructorCourses.length} teaching modules`,
    },
    {
      title: 'Active Rounds',
      value: myCourseRounds.length,
      icon: 'solar:calendar-bold-duotone',
      color: theme.palette.success.main,
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.success.lighter, 0.8)} 0%, ${alpha(theme.palette.success.light, 0.9)} 100%)`,
      textColor: theme.palette.success.darker,
      trend: `${myCourseRounds.filter(r => new Date(r.startDate).getTime() > Date.now()).length} upcoming`,
    },
    {
      title: 'Avg Rating',
      value: avgCourseRating || '—',
      icon: 'solar:star-bold-duotone',
      color: theme.palette.warning.main,
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.warning.lighter, 0.8)} 0%, ${alpha(theme.palette.warning.light, 0.9)} 100%)`,
      textColor: theme.palette.warning.darker,
      trend: avgCourseRating ? 'Top rated' : 'Needs reviews',
    },
  ];

  const chartOptions: ApexOptions = {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: theme.typography.fontFamily,
      background: 'transparent',
    },
    colors: [theme.palette.primary.main, theme.palette.secondary.main],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.2,
        stops: [0, 90, 100],
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    xaxis: {
      categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      labels: {
        style: { colors: theme.palette.text.secondary },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: theme.palette.text.secondary },
      },
    },
    grid: {
      strokeDashArray: 3,
      borderColor: theme.palette.divider,
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      theme: theme.palette.mode,
      x: { show: false },
    },
  };

  const chartSeries = [
    {
      name: 'Student Engagement',
      data: [
        Math.round(totalStudents * 0.6), 
        Math.round(totalStudents * 0.75), 
        Math.round(totalStudents * 0.65), 
        Math.round(totalStudents * 0.8), 
        Math.round(totalStudents * 0.9), 
        Math.round(totalStudents * 0.85), 
        Math.round(totalStudents * 0.95)
      ],
    },
  ];

  return (
    <DashboardContent>
      <Container maxWidth="xl">
        {/* Advanced Welcome Section */}
        <Box
          sx={{
            mb: 5,
            p: { xs: 3, md: 5 },
            borderRadius: 4,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
          }}
        >
          {/* Background Mesh Gradient */}
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(at 0% 0%, ${alpha(theme.palette.secondary.dark, 0.8)} 0px, transparent 50%),
                         radial-gradient(at 100% 0%, ${alpha(theme.palette.primary.main, 0.9)} 0px, transparent 50%),
                         radial-gradient(at 100% 100%, ${alpha(theme.palette.info.main, 0.8)} 0px, transparent 50%),
                         radial-gradient(at 0% 100%, ${alpha(theme.palette.success.dark, 0.5)} 0px, transparent 50%),
                         linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)`,
            zIndex: 0
          }} />

          <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', gap: 4 }}>
            <Avatar
              alt={user?.name}
              sx={{
                width: 100,
                height: 100,
                border: '4px solid rgba(255,255,255,0.2)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                fontSize: '3rem',
                bgcolor: 'white',
                color: 'primary.dark',
              }}
            >
              {user?.name?.charAt(0) || 'I'}
            </Avatar>
            <Box sx={{ textAlign: { xs: 'center', md: 'left' }, color: 'white' }}>
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                Welcome back, {user?.name}
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 500 }}>
                You&apos;re managing{' '}
                <Box component="span" sx={{ fontWeight: 800, color: '#FFD700' }}>
                  {totalStudents} students
                </Box>{' '}
                across {instructorCourses.length} courses. Keep up the great work!
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {statsCards.map((card, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card
                sx={{
                  height: '100%',
                  ...premiumGlass(theme),
                  background: alpha(theme.palette.background.paper, 0.5), // Lighter glass
                  color: 'text.primary',
                  position: 'relative',
                  overflow: 'hidden',
                  p: 3,
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  cursor: 'default',
                  '&:hover': {
                    transform: 'translateY(-8px) scale(1.02)',
                    boxShadow: `0 20px 40px -12px ${alpha(card.color, 0.3)}`,
                    borderColor: alpha(card.color, 0.5),
                    '& .decorative-blob': {
                      transform: 'scale(1.5)',
                      opacity: 0.4,
                    },
                    '& .icon-box': {
                      transform: 'rotate(5deg) scale(1.1)',
                    }
                  },
                }}
              >
                  {/* Decorative glowing blob */}
                  <Box
                    className="decorative-blob"
                    sx={{
                      position: 'absolute',
                      top: -30,
                      right: -30,
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      background: `radial-gradient(circle, ${alpha(card.color, 0.3)} 0%, transparent 70%)`,
                      transition: 'all 0.6s ease',
                      zIndex: 0,
                    }}
                  />
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, position: 'relative', zIndex: 1 }}>
                    <Box 
                      className="icon-box"
                      sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 52,
                        height: 52,
                        borderRadius: '16px', 
                        background: `linear-gradient(135deg, ${alpha(card.color, 0.2)} 0%, ${alpha(card.color, 0.05)} 100%)`, 
                        color: card.color,
                        boxShadow: `inset 0px 2px 4px 0px ${alpha(theme.palette.common.white, 0.2)}`,
                        border: `1px solid ${alpha(card.color, 0.15)}`,
                        transition: 'all 0.3s ease',
                    }}>
                      <Iconify icon={card.icon} width={28} />
                    </Box>
                    <Chip
                      label={card.trend}
                      size="small"
                      sx={{
                        bgcolor: alpha(card.color, 0.1),
                        color: card.color,
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        borderRadius: 1.5,
                        border: `1px solid ${alpha(card.color, 0.2)}`,
                        backdropFilter: 'blur(4px)',
                        px: 0.5,
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="h3" sx={{ fontWeight: 900, mb: 0.5, letterSpacing: '-0.5px' }}>
                      {card.value}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.2px' }}>
                      {card.title}
                    </Typography>
                  </Box>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, lg: 8 }}>
            {/* Engagement Chart */}
            <Box sx={{ ...premiumGlass(theme), mb: 5, p: 4 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>Student Engagement</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Weekly student activity across your courses</Typography>
                </Box>
                <Button variant="outlined" size="small" sx={{ borderRadius: 2 }}>
                  View Details
                </Button>
              </Stack>
              <Box sx={{ height: 300, width: '100%' }}>
                <Chart options={chartOptions} series={chartSeries} type="area" height={300} />
              </Box>
            </Box>

            {/* My Courses Section */}
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
              <Box sx={{ width: 6, height: 32, bgcolor: 'primary.main', borderRadius: 1 }} />
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                My Courses
              </Typography>
            </Stack>

            <Stack spacing={3}>
              {myCourses.map((course) => (
                <Card
                  key={course.id}
                  sx={{
                    ...premiumGlass(theme),
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.shadows[12],
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={3}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>{course.title}</Typography>
                          <Chip
                            label="Active"
                            size="small"
                            sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.main, fontWeight: 700 }}
                          />
                        </Stack>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {course.students} students enrolled
                        </Typography>

                        <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Iconify icon="solar:users-bold" width={18} sx={{ color: 'primary.main' }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>{course.students} Students</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Iconify icon="solar:calendar-bold" width={18} sx={{ color: 'success.main' }} />
                            <Typography variant="caption" sx={{ fontWeight: 600 }}>Active</Typography>
                          </Box>
                        </Stack>
                      </Box>

                      <Stack direction="row" spacing={1.5}>
                        <Button
                          variant="contained"
                          onClick={() => window.location.href = `/course-room/${course.id}`}
                          sx={{ borderRadius: 2, fontWeight: 700 }}
                          startIcon={<Iconify icon="solar:door-open-bold" />}
                        >
                          Open
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => window.location.href = '/instructor/rounds'}
                          sx={{ borderRadius: 2, fontWeight: 700 }}
                        >
                          Rounds
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>

            {/* Active Rounds Section */}
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 6, mb: 3 }}>
              <Box sx={{ width: 6, height: 32, bgcolor: 'success.main', borderRadius: 1 }} />
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Active Rounds
              </Typography>
            </Stack>

            {myCourseRounds.length === 0 ? (
              <Box sx={{ ...premiumGlass(theme), p: 4, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No active rounds at the moment
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {myCourseRounds.map((round) => (
                  <Card
                    key={round.id}
                    sx={{
                      ...premiumGlass(theme),
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: theme.shadows[12],
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={3}>
                      <Stack direction="row" spacing={3} alignItems="center">
                        <Box sx={{ 
                          width: 52, height: 52, borderRadius: 2, 
                          bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main,
                          display: 'grid', placeItems: 'center'
                        }}>
                          <Iconify icon="solar:calendar-bold" width={28} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{round.courseTitle}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Round {round.roundNumber}</Typography>
                        </Box>
                      </Stack>
                      <Button
                        variant="contained"
                        color="primary"
                        sx={{ borderRadius: 2 }}
                        onClick={() => window.location.href = `/course-room/${round.courseId}?roundId=${round.id}`}
                      >
                        Enter Room
                      </Button>
                    </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Grid>

          {/* Right Sidebar */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={3}>
                <Box sx={{ ...premiumGlass(theme), p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Quick Actions</Typography>
                    <Stack spacing={2}>
                    {[
                        { label: 'Manage Rounds', icon: 'solar:calendar-bold', color: theme.palette.primary.main },
                        { label: 'Add Material', icon: 'solar:document-add-bold', color: theme.palette.info.main },
                        { label: 'Schedule Meeting', icon: 'solar:video-camera-add-bold', color: theme.palette.success.main },
                    ].map((action, i) => (
                        <Button 
                            key={i} 
                            fullWidth 
                            variant={i === 0 ? "contained" : "outlined"}
                            startIcon={<Iconify icon={action.icon} />}
                            sx={{ 
                                py: 1.5, borderRadius: 2, 
                                justifyContent: 'flex-start',
                                ...(i === 0 && { bgcolor: action.color, '&:hover': { bgcolor: action.color } })
                            }}
                        >
                            {action.label}
                        </Button>
                    ))}
                    </Stack>
                </Box>

                <Box sx={{ ...premiumGlass(theme), p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Recent Activity</Typography>
                    <Stack spacing={2.5}>
                        {[
                            { title: 'New student enrolled', msg: 'In your course', time: '2h ago', icon: 'solar:user-plus-bold', color: theme.palette.success.main },
                            { title: 'Material uploaded', msg: 'New content added', time: '5h ago', icon: 'solar:document-bold', color: theme.palette.info.main },
                            { title: 'Meeting scheduled', msg: 'Zoom call set up', time: '1d ago', icon: 'solar:video-bold', color: theme.palette.warning.main },
                        ].map((n, i) => (
                            <Box key={i} sx={{ display: 'flex', gap: 2 }}>
                                <Box sx={{ 
                                    p: 1, borderRadius: 1.5, 
                                    bgcolor: alpha(n.color, 0.1),
                                    height: 'fit-content'
                                }}>
                                    <Iconify icon={n.icon} width={20} sx={{ color: n.color }} />
                                </Box>
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>{n.title}</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{n.msg}</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>{n.time}</Typography>
                                </Box>
                            </Box>
                        ))}
                    </Stack>
                </Box>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </DashboardContent>
  );
}
