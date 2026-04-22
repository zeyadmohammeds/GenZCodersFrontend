
import { useMemo, useState, useEffect } from 'react';

import { alpha, useTheme } from '@mui/material/styles';
import {
  Box,
  Card,
  Chip,
  Stack,
  Select,
  Avatar,
  MenuItem,
  Container,
  TextField,
  Typography,
  InputLabel,
  FormControl,
  CardContent,
  InputAdornment,
} from '@mui/material';

import { accountApi, applicationApi } from 'src/api';
import { DashboardContent } from 'src/layouts/dashboard';
import { useCoursesContext } from 'src/contexts/courses-context';
import { useCourseRoundsContext } from 'src/contexts/course-rounds-context';

import { Iconify } from 'src/components/iconify';

interface StudentWithDetails {
  id: number;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: number;
  courseName: string;
  courseRoundId: number;
  roundName: string;
  instructorName: string;
  status: string;
}

export function InstructorStudentsView() {
  const theme = useTheme();
  const { courses } = useCoursesContext();
  const { rounds } = useCourseRoundsContext();

  const [students, setStudents] = useState<StudentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [instructors, setInstructors] = useState<{ id: number; name: string }[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedRound, setSelectedRound] = useState<string>('all');
  const [selectedInstructor, setSelectedInstructor] = useState<string>('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        const apps = await applicationApi.getApplications();
        
        const instructorAccounts = await accountApi.getInstructors();
        setInstructors(instructorAccounts.map(i => ({ id: i.id, name: i.fullName || `Instructor ${i.id}` })));

        const appsWithDetails = apps
          .filter((app: any) => {
            const lowerStatus = (app.status || '').toLowerCase();
            return lowerStatus.includes('pay') || lowerStatus.includes('paid') || lowerStatus.includes('accept');
          })
          .map((app: any) => {
            const roundId = Number(app.courseRoundId);
            const round = rounds.find((r: any) => Number(r.id) === roundId);
            const course = round ? courses.find((c: any) => Number(c.id) === Number(round.courseId)) : null;
            const instructor = course?.instructorId ? instructorAccounts.find((i: any) => String(i.id) === String(course.instructorId)) : null;
            
            let status = 'unknown';
            if ((app.status || '').toLowerCase().includes('pay') || (app.status || '').toLowerCase().includes('paid')) status = 'payed';
            else if ((app.status || '').toLowerCase().includes('accept')) status = 'accepted';

            return {
              id: Number(app.id),
              studentId: String(app.studentId || app.accountId || ''),
              studentName: app.fullNameEn || app.answer1 || 'Student',
              studentEmail: app.email || app.answer2 || '',
              courseId: round?.courseId ?? 0,
              courseName: course?.name || `Course`,
              courseRoundId: Number(app.courseRoundId),
              roundName: round ? `Round ${round.roundNumber}` : '',
              instructorName: instructor?.fullName || course?.instructor || '',
              status,
            };
          });

        setStudents(appsWithDetails as StudentWithDetails[]);
      } catch (err) {
        console.error('Failed to load students:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courses, rounds]);

  const filteredRounds = useMemo(() => {
    if (selectedCourse === 'all') return rounds;
    return rounds.filter(r => String(r.courseId) === selectedCourse);
  }, [rounds, selectedCourse]);

  const filteredStudents = useMemo(() => {
    let result = [...students];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) => 
          s.studentName.toLowerCase().includes(query) ||
          s.studentEmail.toLowerCase().includes(query) ||
          s.courseName.toLowerCase().includes(query)
      );
    }

    if (selectedCourse !== 'all') {
      result = result.filter((s) => s.courseId === Number(selectedCourse));
    }

    if (selectedRound !== 'all') {
      result = result.filter((s) => s.courseRoundId === Number(selectedRound));
    }

    if (selectedInstructor !== 'all') {
      const instructorCourseIds = courses
        .filter(c => c.instructorId && c.instructorId === selectedInstructor)
        .map(c => Number(c.id));
      result = result.filter((s) => instructorCourseIds.includes(Number(s.courseId)));
    }

    return result;
  }, [students, searchQuery, selectedCourse, selectedRound, selectedInstructor, courses]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'payed': return 'success';
      case 'accepted': return 'info';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

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
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ 
              width: 48, 
              height: 48, 
              borderRadius: 2, 
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Iconify icon="solar:users-bold" width={28} sx={{ color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Students
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                View and manage enrolled students
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Filters */}
        <Card sx={{ borderRadius: 3, p: 3, mb: 4 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Iconify icon="solar:magnifer-bold" /></InputAdornment>,
              }}
              sx={{ minWidth: 200 }}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Course</InputLabel>
              <Select
                value={selectedCourse}
                label="Course"
                onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  setSelectedRound('all');
                }}
              >
                <MenuItem value="all">All Courses</MenuItem>
                {courses.map(course => (
                  <MenuItem key={course.id} value={String(course.id)}>{course.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Round</InputLabel>
              <Select
                value={selectedRound}
                label="Round"
                onChange={(e) => setSelectedRound(e.target.value)}
              >
                <MenuItem value="all">All Rounds</MenuItem>
                {filteredRounds.map(round => (
                  <MenuItem key={round.id} value={String(round.id)}>Round {round.roundNumber}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Instructor</InputLabel>
              <Select
                value={selectedInstructor}
                label="Instructor"
                onChange={(e) => setSelectedInstructor(e.target.value)}
              >
                <MenuItem value="all">All Instructors</MenuItem>
                {instructors.map(inst => (
                  <MenuItem key={inst.id} value={String(inst.id)}>{inst.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Card>

        {/* Stats */}
        <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
          <Card sx={{ borderRadius: 3, p: 2, flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                <Iconify icon="solar:users-bold" width={24} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>{filteredStudents.length}</Typography>
                <Typography variant="body2" color="text.secondary">Total Students</Typography>
              </Box>
            </Stack>
          </Card>
          <Card sx={{ borderRadius: 3, p: 2, flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main' }}>
                <Iconify icon="solar:check-circle-bold" width={24} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {filteredStudents.filter((s) => s.status === 'payed').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">Active</Typography>
              </Box>
            </Stack>
          </Card>
          <Card sx={{ borderRadius: 3, p: 2, flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.info.main, 0.1), color: 'info.main' }}>
                <Iconify icon="solar:book-2-bold" width={24} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {new Set(filteredStudents.map((s) => s.courseId)).size}
                </Typography>
                <Typography variant="body2" color="text.secondary">Courses</Typography>
              </Box>
            </Stack>
          </Card>
          <Card sx={{ borderRadius: 3, p: 2, flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.main' }}>
                <Iconify icon="solar:calendar-bold" width={24} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {new Set(filteredStudents.map((s) => s.courseRoundId)).size}
                </Typography>
                <Typography variant="body2" color="text.secondary">Rounds</Typography>
              </Box>
            </Stack>
          </Card>
        </Stack>

        {/* Students Grid */}
        {filteredStudents.length === 0 ? (
          <Card sx={{ borderRadius: 3, p: 6, textAlign: 'center' }}>
            <Iconify icon="solar:users-bold" width={64} sx={{ color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No students found</Typography>
            <Typography variant="body2" color="text.disabled">Try adjusting your filters</Typography>
          </Card>
        ) : (
          <Stack spacing={2}>
            {filteredStudents.map((student) => (
              <Card key={student.id} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48, fontWeight: 800 }}>
                      {student.studentName.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {student.studentName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {student.studentEmail || 'No email'}
                      </Typography>
                    </Box>
                    <Chip label={student.courseName} size="small" variant="outlined" />
                    <Chip label={student.roundName} size="small" variant="outlined" />
                    <Chip label={student.status.toUpperCase()} size="small" color={getStatusColor(student.status) as any} />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Container>
    </DashboardContent>
  );
}
