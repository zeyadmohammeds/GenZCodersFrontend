import type { ApexOptions } from 'apexcharts';
import type { WeekDto } from 'src/api/models/week';
import type { MaterialDto } from 'src/api/models/material';

import Chart from 'react-apexcharts';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CardContent from '@mui/material/CardContent';
import { alpha, useTheme } from '@mui/material/styles';
import LinearProgress from '@mui/material/LinearProgress';

import { weekApi } from 'src/api/services/week.api';
import { DashboardContent } from 'src/layouts/dashboard';
import { useAuth } from 'src/contexts/simple-auth-context';
import { useCoursesContext } from 'src/contexts/courses-context';
import { courseMaterialApi } from 'src/api/services/course-material.api';
import { useApplicationsContext } from 'src/contexts/applications-context';
import { useCourseRoundsContext } from 'src/contexts/course-rounds-context';

import { Iconly } from 'src/components/iconly';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  type: string;
  read: boolean;
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'assignment':
      return 'solar:pen-bold-duotone';
    case 'grade':
      return 'solar:eye-bold-duotone';
    case 'meeting':
      return 'solar:videocamera-bold-duotone';
    default:
      return 'solar:bell-bold-duotone';
  }
};

const getEventIcon = (type: string) => {
  switch (type) {
    case 'zoom':
      return 'solar:videocamera-bold-duotone';
    case 'assignment':
      return 'solar:pen-bold-duotone';
    default:
      return 'solar:calendar-bold-duotone';
  }
};

type EnrolledCourse = {
  id: string;
  title: string;
  instructor: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  nextLesson: string;
  dueAssignment: string;
  dueDate: Date;
  grade: string;
  coverUrl: string;
  roundId?: string;
  nextZoomLink?: string;
  nextZoomTime?: string;
  nextZoomPassword?: string;
  durationHours: number;
};

const premiumGlass = (theme: any) => ({
  background: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(20px)',
  border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
  boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.05)}`,
  borderRadius: 3,
});

export function StudentDashboardView() {
  const { user } = useAuth();
  const theme = useTheme();

  const { courses } = useCoursesContext();
  const { applications } = useApplicationsContext();
  const { getRoundById } = useCourseRoundsContext();

  const [weeksByRound, setWeeksByRound] = useState<Record<string, WeekDto[]>>({});
  const [materialsByRound, setMaterialsByRound] = useState<Record<string, MaterialDto[]>>({});
  const [nextZoomByCourseId, setNextZoomByCourseId] = useState<Record<string, { meetingLink: string; meetingDateTime: string; meetingPassword?: string }>>({});
  const [loading, setLoading] = useState(true);

  // Load Weeks, Materials, and Zoom Meetings for Enrolled Courses
  useEffect(() => {
    let cancelled = false;

    const loadRealData = async () => {
      const userId = user?.id;
      if (!userId) return;

      const accepted = applications.filter(
        (a) => a.studentId === userId && (a.status === 'accepted' || a.status === 'payed')
      );
      if (accepted.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const now = Date.now();
        const promises = accepted.map(async (app) => {
          const roundId = app.courseRoundId != null ? String(app.courseRoundId) : null;
          if (!roundId) return null;

          // Fetch Weeks
          let weeks: WeekDto[] = [];
          try {
            weeks = await weekApi.getByCourseRoundId(Number(roundId));
          } catch (e) {
            console.error(`Failed to fetch weeks for round ${roundId}`, e);
          }
          
          // Fetch Materials (for next lesson, custom Zoom entries)
          let materials: MaterialDto[] = [];
          try {
            materials = await courseMaterialApi.getByCourseRoundId(Number(roundId));
          } catch (e) {
            console.error(`Failed to fetch materials for round ${roundId}`, e);
          }

          // Zoom: use ZoomLink materials (materialTypeStatusId 34)
          const zoomMaterials = materials.filter((m) => m.materialTypeStatusId === 34);
          const nextZoom = zoomMaterials.length > 0
            ? { meetingLink: zoomMaterials[0].link ?? '', meetingDateTime: '', meetingPassword: zoomMaterials[0].meetingPassword ?? '' }
            : null;

          return {
            courseId: app.courseId,
            roundId,
            weeks,
            materials,
            nextZoom,
          };
        });

        const results = await Promise.all(promises);

        if (cancelled) return;

        const newWeeksMap: Record<string, WeekDto[]> = {};
        const newMaterialsMap: Record<string, MaterialDto[]> = {};
        const newZoomMap: Record<string, { meetingLink: string; meetingDateTime: string; meetingPassword?: string }> = {};

        results.forEach((res) => {
          if (!res) return;
          if (res.weeks.length > 0) newWeeksMap[res.roundId] = res.weeks;
          if (res.materials.length > 0) newMaterialsMap[res.roundId] = res.materials;
          if (res.nextZoom) newZoomMap[res.courseId] = res.nextZoom;
        });

        setWeeksByRound(newWeeksMap);
        setMaterialsByRound(newMaterialsMap);
        setNextZoomByCourseId(newZoomMap);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRealData();

    return () => {
       cancelled = true;
    };
  }, [applications, user?.id]);

  // Derive Enrolled Course Data
  const enrolledCoursesData: EnrolledCourse[] = useMemo(() => {
    const userId = user?.id;
    if (!userId) return [];

    const accepted = applications.filter(
      (a) => a.studentId === userId && (a.status === 'accepted' || a.status === 'payed')
    );
    const now = new Date();

    return accepted.map((app) => {
      const course = courses.find((c) => c.id === app.courseId);
      const title = course?.name ?? app.metadata?.courseName ?? 'Course';
      const instructor = course?.instructor ?? '';
      
      const roundId = app.courseRoundId != null ? String(app.courseRoundId) : undefined;
      const round = roundId ? getRoundById(roundId) : undefined;
      
      // Data from Maps
      const weeks = roundId ? weeksByRound[roundId] || [] : [];
      const materials = roundId ? materialsByRound[roundId] || [] : [];
      
      // Zoom: Check Materials first (Status 34), then API fallback
      let zoomLink = nextZoomByCourseId[app.courseId]?.meetingLink ?? '';
      let zoomTime = nextZoomByCourseId[app.courseId]?.meetingDateTime ?? '';
      let zoomPassword = nextZoomByCourseId[app.courseId]?.meetingPassword ?? '';

      // Find upcoming zoom material
      const zoomMaterials = materials.filter(m => m.materialTypeStatusId === 34); // 34 = ZoomLink
      if (zoomMaterials.length > 0) {
          // If we had dates on materials, we'd sort by date. 
          // For now, take the first one related to a current or future week.
          const currentOrFutureWeeks = weeks.filter(w => new Date(w.endDate) >= now).map(w => w.id);
          const relevantZoom = zoomMaterials.find(m => m.weekId && currentOrFutureWeeks.includes(m.weekId));
          
          if (relevantZoom && relevantZoom.link) {
              zoomLink = relevantZoom.link;
              zoomPassword = relevantZoom.meetingPassword || '';
              // Try to find week date for time context
              const w = weeks.find(wk => wk.id === relevantZoom.weekId);
              if (w) zoomTime = w.startDate; // Approximation if material has no date
          }
      }

      // Calculate Progress based on Weeks
      let progress = 0;
      let totalLessons = weeks.length || 12; // Default to 12 if no weeks
      let completedLessons = 0;
      
      let nextLesson = 'No active lesson';
      let dueAssignment = 'Check details';
      let dueDate = new Date();

      if (weeks.length > 0) {
        totalLessons = weeks.length;
        const sortedWeeks = [...weeks].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        
        let foundCurrent = false;

        sortedWeeks.forEach((week, idx) => {
           const start = new Date(week.startDate);
           const end = new Date(week.endDate);
           
           if (now > end) {
             completedLessons++;
           } else if (now >= start && now <= end) {
             foundCurrent = true;
             nextLesson = week.weekTitle || `Week ${idx + 1}`;
             dueDate = end; 
             dueAssignment = 'Weekly Tasks'; 
             
             // Check materials for this week
             const weekMaterials = materials.filter(m => m.weekId === week.id);
             if(weekMaterials.length > 0) {
                 const assignment = weekMaterials.find(m => m.title.toLowerCase().includes('assignment') || m.title.toLowerCase().includes('quiz') || m.materialTypeStatusId === 36); // 36 = Quiz
                 if(assignment) {
                     dueAssignment = assignment.title;
                 }
                 // If nextLesson generic, try to find a lesson title
                 if (nextLesson.startsWith('Week')) {
                     const lesson = weekMaterials.find(m => m.parentMaterialId === 0 || m.parentMaterialId === null);
                     if (lesson) nextLesson = lesson.title;
                 }
             }
           } else if (!foundCurrent && now < start && nextLesson === 'No active lesson') {
              // Future week, first one found
              nextLesson = week.weekTitle || `Week ${idx + 1}`;
              dueDate = end;
              
               const weekMaterials = materials.filter(m => m.weekId === week.id);
               if(weekMaterials.length > 0) {
                    const lesson = weekMaterials.find(m => m.parentMaterialId === 0 || m.parentMaterialId === null);
                     if (lesson) nextLesson = lesson.title;
               }
           }
        });

        // Calculate percentage
        if (completedLessons > 0) {
           progress = Math.round((completedLessons / totalLessons) * 100);
           if (foundCurrent) {
               progress += Math.round((1 / totalLessons) * 50); 
           }
        }
      }

      return {
        id: app.courseId,
        title,
        instructor,
        progress: Math.min(progress, 100),
        totalLessons,
        completedLessons,
        nextLesson,
        dueAssignment,
        dueDate,
        grade: '—', // Placeholder as per finding
        coverUrl: '/assets/school/course.webp',
        roundId: round?.id ?? roundId,
        nextZoomLink: zoomLink,
        nextZoomTime: zoomTime,
        nextZoomPassword: zoomPassword,
        durationHours: course?.duration || 0,
      };
    });
  }, [applications, courses, getRoundById, nextZoomByCourseId, materialsByRound, weeksByRound, user?.id]);


  const studentData = useMemo(() => {
      // Calculate Stats
      const totalCourses = enrolledCoursesData.length;
      
      // Study Hours: Sum (Progress % * Duration)
      const studyHours = Math.round(enrolledCoursesData.reduce((acc, c) => acc + (c.durationHours * (c.progress / 100)), 0));

      const completedAssignments = enrolledCoursesData.reduce((acc, c) => acc + c.completedLessons, 0); // Approx: 1 assignment per week/lesson

      // Events: Zoom meetings
      const upcomingEvents = enrolledCoursesData
        .filter(c => c.nextZoomTime && new Date(c.nextZoomTime).getTime() > Date.now())
        .map(c => ({
            id: c.id,
            title: 'Live Session',
            course: c.title,
            date: new Date(c.nextZoomTime!),
            type: 'zoom',
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      return {
        enrolledCourses: enrolledCoursesData,
        recentNotifications: [] as Notification[], // Cast to Notification[]
        upcomingEvents,
        stats: {
            totalCourses,
            completedAssignments, // Using completed lessons as proxy
            averageGrade: '—',
            studyHours,
        }
      };
  }, [enrolledCoursesData]);

  const statsCards = [
    {
      title: 'Enrolled Courses',
      value: studentData.stats.totalCourses,
      icon: 'solar:notebook-bold-duotone',
      color: theme.palette.primary.main,
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.primary.lighter, 0.8)} 0%, ${alpha(theme.palette.primary.light, 0.9)} 100%)`,
      textColor: theme.palette.primary.darker,
      trend: `${enrolledCoursesData.filter(c => c.progress > 0 && c.progress < 100).length} in progress`,
    },
    {
      title: 'Completed Tasks',
      value: studentData.stats.completedAssignments,
      icon: 'solar:check-circle-bold-duotone',
      color: theme.palette.success.main,
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.success.lighter, 0.8)} 0%, ${alpha(theme.palette.success.light, 0.9)} 100%)`,
      textColor: theme.palette.success.darker,
      trend: `${studentData.stats.completedAssignments > 0 ? (studentData.stats.completedAssignments / Math.max(studentData.stats.totalCourses, 1)).toFixed(1) + ' avg' : 'Keep going!'}`,
    },
    {
      title: 'Average Grade',
      value: studentData.stats.averageGrade,
      icon: 'solar:diploma-bold-duotone',
      color: theme.palette.warning.main,
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.warning.lighter, 0.8)} 0%, ${alpha(theme.palette.warning.light, 0.9)} 100%)`,
      textColor: theme.palette.warning.darker,
      trend: 'Pending review',
    },
    {
      title: 'Study Hours',
      value: `${studentData.stats.studyHours}h`,
      icon: 'solar:clock-circle-bold-duotone',
      color: theme.palette.info.main,
      bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.info.lighter, 0.8)} 0%, ${alpha(theme.palette.info.light, 0.9)} 100%)`,
      textColor: theme.palette.info.darker,
      trend: 'Total invested',
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
      name: 'Study Hours',
      data: [2, 4, 3, 5, 4, 6, 3],
    },
  ];

  const enrolledCourses = studentData.enrolledCourses;
  const overallProgress = enrolledCourses.length
    ? Math.round(enrolledCourses.reduce((sum, course) => sum + course.progress, 0) / enrolledCourses.length)
    : 0;
  const activeCoursesCount = enrolledCourses.filter((course) => course.progress > 0 && course.progress < 100).length;
  const nextUpCourse = enrolledCourses.reduce(
    (best, course) => {
      if (!best) return course;
      if (course.progress === best.progress) return course.dueDate < best.dueDate ? course : best;
      return course.progress > best.progress ? course : best;
    },
    enrolledCourses[0]
  );
  const nearestDueCourse = enrolledCourses.reduce(
    (best, course) => {
      if (!best) return course;
      return course.dueDate < best.dueDate ? course : best;
    },
    enrolledCourses[0]
  );

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
            animation: 'fadeIn 0.8s ease-out',
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
              {user?.name?.charAt(0) || 'S'}
            </Avatar>
            <Box sx={{ textAlign: { xs: 'center', md: 'left' }, color: 'white' }}>
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                Welcome back, {user?.name}
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 500 }}>
                 You&apos;ve completed{' '}
                <Box component="span" sx={{ fontWeight: 800, color: '#FFD700' }}>
                  {studentData.stats.completedAssignments} tasks
                </Box>{' '}
                this week. Keep up the momentum!
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

        <Grid container spacing={3}>
          {/* Main Content: Courses & Chart */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
              sx={{ mb: 2, gap: 1.5 }}
            >
              <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Iconly name="Bookmark" size={22} sx={{ color: 'primary.main' }} />
                My Learning Path
              </Typography>
              <Button
                href="/my-courses"
                endIcon={<Iconly name="Arrow - Right" size={18} sx={{ color: 'inherit' }} />}
                sx={{ fontWeight: 600 }}
              >
                View All
              </Button>
            </Stack>

            <Card
              sx={{
                mb: 3,
                p: 2.5,
                borderRadius: 3,
                boxShadow: 'none',
                border: '1px solid',
                borderColor: alpha(theme.palette.primary.main, 0.16),
                bgcolor: alpha(theme.palette.primary.main, 0.06),
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Iconly name="Chart" size={20} sx={{ color: 'primary.main' }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Overall progress
                      </Typography>
                      <Chip
                        label={`${overallProgress}%`}
                        size="small"
                        color="primary"
                        sx={{ fontWeight: 700, ml: 'auto' }}
                      />
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={overallProgress}
                      sx={{
                        height: 10,
                        borderRadius: 6,
                        bgcolor: alpha(theme.palette.grey[500], 0.16),
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 6,
                          backgroundImage: `linear-gradient(45deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                        },
                      }}
                    />
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {activeCoursesCount} active course{activeCoursesCount === 1 ? '' : 's'} • Keep going!
                    </Typography>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    justifyContent="flex-end"
                  >
                    {nearestDueCourse ? (
                      <Chip
                        icon={<Iconly name="Time Circle" size={16} sx={{ color: 'inherit' }} />}
                        label={`Next due: ${nearestDueCourse.dueDate.toLocaleDateString()}`}
                        variant="outlined"
                        sx={{
                          fontWeight: 600,
                          borderColor: alpha(theme.palette.warning.main, 0.35),
                          color: theme.palette.warning.darker,
                          bgcolor: alpha(theme.palette.warning.main, 0.08),
                        }}
                      />
                    ) : null}

                    {nextUpCourse ? (
                      <Button
                        href={`/course-room/${nextUpCourse.id}`}
                        variant="contained"
                        startIcon={<Iconly name="Play" size={18} sx={{ color: 'inherit' }} />}
                        sx={{
                          px: 2,
                          borderRadius: 2,
                          boxShadow: '0 10px 22px rgba(37, 99, 235, 0.24)',
                          fontWeight: 700,
                        }}
                      >
                        Continue learning
                      </Button>
                    ) : null}
                  </Stack>
                </Grid>
              </Grid>
            </Card>

            {/* Activity Chart */}
            <Card sx={{ mb: 3, p: 3, boxShadow: theme.shadows[2] }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Learning Activity</Typography>
                <Button endIcon={<Iconify icon="solar:alt-arrow-right-line-duotone" />} size="small">
                  View Full Report
                </Button>
              </Stack>
              <Box sx={{ height: 350, width: '100%' }}>
                <Chart options={chartOptions} series={chartSeries} type="area" height={350} />
              </Box>
            </Card>

            <Stack spacing={2.5}>
              {enrolledCourses.map((course) => (
                <Card
                  key={course.id}
                  sx={{
                    ...premiumGlass(theme),
                    borderRadius: 4, // Intentionally overriding generic radius with 4
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.shadows[16],
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid size={{ xs: 12, sm: 'auto' }}>
                        <Box
                          sx={{
                            width: 96,
                            height: 96,
                            borderRadius: 2.5,
                            overflow: 'hidden',
                            position: 'relative',
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            backgroundImage: course.coverUrl ? `url(${course.coverUrl})` : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        >
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              bgcolor: alpha(theme.palette.common.black, 0.25),
                            }}
                          />
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'common.white',
                            }}
                          >
                            <Iconly name="Document" size={34} sx={{ color: 'common.white' }} />
                          </Box>
                        </Box>
                      </Grid>

                      <Grid size={{ xs: 12, md: 5 }}>
                        <Stack spacing={0.75}>
                          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                            {course.title}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {course.instructor}
                          </Typography>

                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Chip
                              label={`Next: ${course.nextLesson}`}
                              size="small"
                              color="info"
                              sx={{ fontWeight: 700 }}
                            />
                            {course.nextZoomLink ? (
                              <Chip
                                icon={<Iconify icon="solar:videocamera-bold-duotone" />}
                                label="Next live session"
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ fontWeight: 700 }}
                              />
                            ) : null}
                            <Chip
                              label={`Grade: ${course.grade}`}
                              size="small"
                              variant="outlined"
                              color="success"
                              sx={{ fontWeight: 700 }}
                            />
                          </Stack>

                          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mt: 0.25 }}>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              <Iconly name="Tick Square" size={16} sx={{ color: 'text.secondary' }} />
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                {course.completedLessons}/{course.totalLessons} lessons
                              </Typography>
                            </Stack>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              <Iconly name="Time Circle" size={16} sx={{ color: 'warning.main' }} />
                              <Typography variant="caption" sx={{ color: 'warning.darker', fontWeight: 700 }}>
                                {course.dueDate.toLocaleDateString()}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                                • {course.dueAssignment}
                              </Typography>
                            </Stack>
                          </Stack>
                        </Stack>
                      </Grid>

                      <Grid size={{ xs: 12, md: 4 }}>
                        <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                            Progress
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 800 }}>
                            {course.progress}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={course.progress}
                          sx={{
                            height: 10,
                            borderRadius: 6,
                            bgcolor: alpha(theme.palette.grey[500], 0.16),
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 6,
                              backgroundImage: `linear-gradient(45deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                            },
                          }}
                        />

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.25 }}>
                          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            {[0, 1, 2].map((i) => {
                              const active = course.progress >= (i + 1) * 33;
                              return (
                                <Box
                                  key={i}
                                  sx={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    bgcolor: active ? 'primary.main' : alpha(theme.palette.text.disabled, 0.35),
                                  }}
                                />
                              );
                            })}
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                              Milestones
                            </Typography>
                          </Box>

                          <IconButton
                            href={course.roundId ? `/course-room/${course.id}?roundId=${course.roundId}` : `/course-room/${course.id}`}
                            color="primary"
                            sx={{
                              width: 52,
                              height: 52,
                              bgcolor: 'primary.main',
                              color: 'common.white',
                              '&:hover': { bgcolor: 'primary.dark', transform: 'scale(1.06)' },
                              transition: 'all 0.2s',
                              boxShadow: '0 10px 18px rgba(37, 99, 235, 0.24)',
                            }}
                          >
                            <Iconly name="Play" size={24} sx={{ color: 'common.white' }} />
                          </IconButton>
                        </Box>

                        {course.nextZoomLink ? (
                          <Box sx={{ mt: 1.5 }}>
                            <Button
                              fullWidth
                              variant="outlined"
                              href={course.nextZoomLink}
                              target="_blank"
                              rel="noreferrer"
                              startIcon={<Iconify icon="solar:videocamera-bold-duotone" />}
                              sx={{ borderRadius: 2, fontWeight: 800 }}
                            >
                              Join next live session
                            </Button>
                            {course.nextZoomPassword && (
                              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, textAlign: 'center', color: 'text.secondary', fontWeight: 600 }}>
                                Password: {course.nextZoomPassword}
                              </Typography>
                            )}
                          </Box>
                        ) : null}
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Grid>

          {/* Sidebar: Notifications & Events */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={{ height: '100%', ...premiumGlass(theme) }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 800 }}>
                  Updates & Events
                </Typography>

                <Stack spacing={4}>
                   {studentData.recentNotifications.length > 0 && (
                     <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, textTransform: 'uppercase', fontWeight: 800, letterSpacing: 1.1, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Iconify icon="solar:bell-bold" width={14} /> Notifications
                        </Typography>
                        <Stack spacing={1.5}>
                          {studentData.recentNotifications.map((notification: any) => (
                            <Box 
                              key={notification.id} 
                              sx={{ 
                                p: 2, 
                                borderRadius: 2, 
                                bgcolor: notification.read ? alpha(theme.palette.background.default, 0.5) : alpha(theme.palette.primary.main, 0.08),
                                border: '1px solid',
                                borderColor: notification.read ? 'transparent' : alpha(theme.palette.primary.main, 0.1),
                                display: 'flex',
                                gap: 2,
                                transition: 'all 0.2s',
                                '&:hover': { bgcolor: alpha(theme.palette.background.paper, 0.8), boxShadow: theme.shadows[2] }
                              }}
                            >
                               <Box sx={{ mt: 0.5 }}>
                                  <Iconify icon={getNotificationIcon(notification.type)} color={notification.read ? 'text.disabled' : 'primary.main'} width={24} />
                               </Box>
                               <Box>
                                  <Typography variant="subtitle2" fontWeight={700}>{notification.title}</Typography>
                                  <Typography variant="body2" sx={{ color: 'text.secondary', display: 'block', mb: 0.5, lineHeight: 1.4 }}>{notification.message}</Typography>
                                  <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>{notification.time}</Typography>
                               </Box>
                            </Box>
                          ))}
                        </Stack>
                     </Box>
                   )}
                   
                   <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2, textTransform: 'uppercase', fontWeight: 800, letterSpacing: 1.1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Iconify icon="solar:calendar-mark-bold" width={14} /> Upcoming Focus
                      </Typography>
                      {studentData.upcomingEvents.length > 0 || nextUpCourse ? (
                        <Stack spacing={2}>
                           {studentData.upcomingEvents.slice(0, 1).map((event: any) => (
                              <Card key={event.id} sx={{ 
                                  bgcolor: alpha(theme.palette.background.paper, 0.6), 
                                  backdropFilter: 'blur(10px)',
                                  p: 2.5, 
                                  boxShadow: theme.shadows[4],
                                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                              }}>
                                 <Stack direction="row" spacing={2} alignItems="center">
                                    <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 2, color: 'primary.main' }}>
                                       <Iconify icon={getEventIcon(event.type)} width={28} />
                                    </Box>
                                    <Box>
                                       <Typography variant="subtitle1" fontWeight={800}>{event.title}</Typography>
                                       <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 0.5 }}>
                                           {event.course}
                                       </Typography>
                                       <Chip size="small" color="primary" variant="outlined" label={`${event.date.toLocaleDateString()} • ${event.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`} sx={{ fontWeight: 700 }} />
                                    </Box>
                                 </Stack>
                              </Card>
                           ))}
                           {studentData.upcomingEvents.length === 0 && nextUpCourse && (
                              <Card sx={{ 
                                  bgcolor: alpha(theme.palette.background.paper, 0.6), 
                                  backdropFilter: 'blur(10px)',
                                  p: 2.5, 
                                  boxShadow: theme.shadows[4],
                                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
                              }}>
                                 <Stack direction="row" spacing={2} alignItems="center">
                                    <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 2, color: 'info.main' }}>
                                       <Iconly name="Play" size={28} />
                                    </Box>
                                    <Box>
                                       <Typography variant="subtitle1" fontWeight={800}>Next Lesson</Typography>
                                       <Typography variant="body2" color="text.primary" fontWeight={700} sx={{ mb: 0.5 }}>
                                           {nextUpCourse.nextLesson}
                                       </Typography>
                                       <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                           {nextUpCourse.title}
                                       </Typography>
                                    </Box>
                                 </Stack>
                              </Card>
                           )}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">No upcomings scheduled at this moment.</Typography>
                      )}
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
