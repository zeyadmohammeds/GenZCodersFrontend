import type { ApexOptions } from 'apexcharts';
import type { EngineerDashboardDto } from 'src/api/models/engineer-dashboard';

import Chart from 'react-apexcharts';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import { alpha, useTheme } from '@mui/material/styles';

import { engineerDashboardApi } from 'src/api';
import { DashboardContent } from 'src/layouts/dashboard';
import { useAuth } from 'src/contexts/simple-auth-context';
import { useCoursesContext } from 'src/contexts/courses-context';
import { useCourseRoundsContext } from 'src/contexts/course-rounds-context';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const premiumGlass = (theme: any) => ({
  background: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(20px)',
  border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
  boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.05)}`,
  borderRadius: 3,
});

export function EngineerDashboardView() {
  const { user } = useAuth();
  const theme = useTheme();
  const { courses } = useCoursesContext();
  const { rounds } = useCourseRoundsContext();

  const [data, setData] = useState<EngineerDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    if (!data) {
      return {
        totalCourses: 0,
        totalCourseRounds: 0,
        totalAcceptedApplications: 0,
        totalRejectedApplications: 0,
        totalPendingApplications: 0,
        topCourses: [],
      };
    }

    return {
      totalCourses: data.totalCourses,
      totalCourseRounds: data.totalCourseRounds,
      totalAcceptedApplications: data.totalAcceptedApplications,
      totalRejectedApplications: data.totalRejectedApplications,
      totalPendingApplications: data.totalPendingApplications,
      topCourses: data.topCourses || [],
    };
  }, [data]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const next = await engineerDashboardApi.getDashboard();
      setData(next);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load engineer dashboard';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const statsCards = [
    {
      title: 'Total Courses',
      value: stats.totalCourses,
      icon: 'solar:notebook-bold-duotone',
      color: theme.palette.primary.main,
      textColor: theme.palette.primary.darker,
      subtitle: 'In platform',
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.primary.lighter, 0.8)} 0%, ${alpha(theme.palette.primary.light, 0.9)} 100%)`,
      trend: 'Active',
    },
    {
      title: 'Course Rounds',
      value: stats.totalCourseRounds,
      icon: 'solar:calendar-bold-duotone',
      color: theme.palette.secondary.main,
      textColor: theme.palette.secondary.darker,
      subtitle: 'Running rounds',
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.secondary.lighter, 0.8)} 0%, ${alpha(theme.palette.secondary.light, 0.9)} 100%)`,
      trend: 'Active',
    },
    {
      title: 'Accepted',
      value: stats.totalAcceptedApplications,
      icon: 'solar:check-circle-bold-duotone',
      color: theme.palette.success.main,
      textColor: theme.palette.success.darker,
      subtitle: 'Applications',
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.success.lighter, 0.8)} 0%, ${alpha(theme.palette.success.light, 0.9)} 100%)`,
      trend: '+12%',
    },
    {
      title: 'Pending',
      value: stats.totalPendingApplications,
      icon: 'solar:hourglass-bold-duotone',
      color: theme.palette.warning.main,
      textColor: theme.palette.warning.darker,
      subtitle: 'Needs review',
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.warning.lighter, 0.8)} 0%, ${alpha(theme.palette.warning.light, 0.9)} 100%)`,
      trend: 'Action',
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
    },
    tooltip: {
      theme: theme.palette.mode,
    },
  };

  const chartSeries = [
    {
      name: 'Applications',
      data: [45, 52, 38, 24, 33, 26, 21],
    },
    {
      name: 'Courses Created',
      data: [35, 41, 62, 42, 13, 18, 29],
    },
  ];

  const barChartOptions: ApexOptions = {
    chart: {
      fontFamily: theme.typography.fontFamily,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: true,
        barHeight: '45%',
        distributed: true,
      },
    },
    colors: [
      theme.palette.primary.main,
      theme.palette.primary.dark,
      theme.palette.grey[900],
      theme.palette.grey[700],
      theme.palette.grey[500],
    ],
    dataLabels: {
      enabled: true,
      textAnchor: 'start',
      style: {
        colors: ['#fff'],
        fontWeight: 700,
      },
      formatter: (val: any, opt: any) => opt.w.globals.labels[opt.dataPointIndex] + ': ' + val,
      offsetX: 0,
    },
    xaxis: {
      categories: stats.topCourses.map((c) => c.courseTitle),
      labels: {
        style: { colors: theme.palette.text.secondary },
      },
    },
    yaxis: {
      labels: { show: false },
    },
    grid: { show: false },
    tooltip: {
      theme: theme.palette.mode,
      y: { title: { formatter: () => '' } },
    },
    legend: { show: false },
  };

  const barSeries = [
    {
      name: 'Impact',
      data: stats.topCourses.map((c) => c.applicationCount),
    },
  ];

  return (
    <DashboardContent>
      <Container maxWidth="xl">
        <Box
          sx={{
            mb: 5,
            p: 4,
            borderRadius: 3,
            position: 'relative',
            overflow: 'hidden',
            background: `linear-gradient(135deg, ${theme.palette.secondary.dark} 0%, ${theme.palette.primary.main} 100%)`,
            color: 'white',
            boxShadow: theme.shadows[8],
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Avatar
              alt={user?.name}
              sx={{
                width: 84,
                height: 84,
                bgcolor: 'white',
                color: 'primary.main',
                fontSize: '2.5rem',
                fontWeight: 'bold',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              }}
            >
              {user?.name?.charAt(0) || 'E'}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                Engineer Dashboard
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Welcome back, {user?.name}! Manage courses, rounds, and applications efficiently.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              href="/engineer/rounds"
              sx={{ borderColor: 'rgba(255,255,255,0.4)', color: 'white' }}
            >
              Manage Rounds
            </Button>
          </Box>

          <Box
            sx={{
              position: 'absolute',
              top: -60,
              right: -60,
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
            }}
          />
        </Box>

        {error && (
          <Alert
            severity="error"
            variant="outlined"
            sx={{ borderRadius: 2, borderColor: 'error.main', mb: 3 }}
            action={
              <Button color="error" size="small" variant="contained" onClick={fetchDashboard}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

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
                      {loading ? '...' : card.value}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.2px' }}>
                      {card.title}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary', opacity: 0.8 }}>
                      {card.subtitle}
                    </Typography>
                  </Box>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ mb: 3, p: 3, boxShadow: theme.shadows[2] }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Platform Activity (Last 7 Days)
                </Typography>
                <Button variant="outlined" size="small">
                  Export
                </Button>
              </Stack>
              <Box sx={{ height: 350, width: '100%' }}>
                <Chart options={chartOptions} series={chartSeries} type="area" height={350} />
              </Box>
            </Card>

            <Card sx={{ mb: 3, p: 3, boxShadow: theme.shadows[2] }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Course Impact Ranking
                </Typography>
                <Button variant="text" color="primary" endIcon={<Iconify icon="solar:arrow-right-bold" width={16} />} sx={{ fontWeight: 700 }}>
                  Review Courses
                </Button>
              </Stack>
              <Box sx={{ height: 350 }}>
                {loading ? null : <Chart options={barChartOptions} series={barSeries} type="bar" height={350} />}
              </Box>
            </Card>

            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Top Performing Courses
              </Typography>
              <Button href="/engineer/courses" endIcon={<Iconify icon="solar:alt-arrow-right-line-duotone" />}>
                View All
              </Button>
            </Stack>

            <Stack spacing={2.5}>
              {loading ? (
                <Card sx={{ p: 3, borderRadius: 3 }}>
                  <Typography variant="body2" color="text.secondary">Loading...</Typography>
                </Card>
              ) : stats.topCourses.length === 0 ? (
                <Card sx={{ p: 3, borderRadius: 3 }}>
                  <Typography variant="body2" color="text.secondary">No courses data available.</Typography>
                </Card>
              ) : (
                stats.topCourses.slice(0, 5).map((course, index) => (
                  <Card
                    key={course.courseId}
                    sx={{
                      borderRadius: 3,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        borderColor: alpha(theme.palette.primary.main, 0.35),
                        boxShadow: theme.shadows[10],
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: '50%',
                              bgcolor: index === 0 ? 'primary.main' : 'grey.200',
                              color: index === 0 ? 'white' : 'text.primary',
                              display: 'grid',
                              placeItems: 'center',
                              fontWeight: 900,
                            }}
                          >
                            {index + 1}
                          </Box>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 800 }} noWrap>
                              {course.courseTitle}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ID: {course.courseId}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip label={`${course.applicationCount} Applications`} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                      </Stack>
                    </CardContent>
                    <CardActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                      <Button
                        variant="contained"
                        startIcon={<Iconify icon="solar:eye-bold-duotone" />}
                        href={`/course-room/${course.courseId}`}
                      >
                        View Course
                      </Button>
                    </CardActions>
                  </Card>
                ))
              )}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={{ mb: 3, boxShadow: theme.shadows[2] }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                  Quick Actions
                </Typography>

                <Stack spacing={1.5}>
                  <Button variant="contained" fullWidth startIcon={<Iconify icon="solar:add-circle-bold-duotone" />} href="/engineer/rounds">
                    Create Round
                  </Button>
                  <Button variant="outlined" fullWidth startIcon={<Iconify icon="solar:users-group-rounded-bold-duotone" />} href="/engineer/applications">
                    Manage Applications
                  </Button>
                  <Button variant="outlined" fullWidth startIcon={<Iconify icon="solar:notebook-bold-duotone" />} href="/engineer/courses">
                    View Courses
                  </Button>
                  <Button variant="outlined" fullWidth startIcon={<Iconify icon="solar:chart-square-bold-duotone" />} href="/engineer/dashboard">
                    View Analytics
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            <Card sx={{ boxShadow: theme.shadows[2] }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                  Platform Stats
                </Typography>

                <Stack spacing={2}>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Total Courses</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>{stats.totalCourses}</Typography>
                    </Stack>
                  </Box>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.secondary.main, 0.08) }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Active Rounds</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: 'secondary.main' }}>{stats.totalCourseRounds}</Typography>
                    </Stack>
                  </Box>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.08) }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Accepted Applications</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: 'success.main' }}>{stats.totalAcceptedApplications}</Typography>
                    </Stack>
                  </Box>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.08) }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Pending Applications</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: 'warning.main' }}>{stats.totalPendingApplications}</Typography>
                    </Stack>
                  </Box>
                  <Box sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.error.main, 0.08) }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Rejected Applications</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: 'error.main' }}>{stats.totalRejectedApplications}</Typography>
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </DashboardContent>
  );
}
