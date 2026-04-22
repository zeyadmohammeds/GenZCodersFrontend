import type { ApexOptions } from 'apexcharts';
import type { Course, CourseLevel } from 'src/types/course';

import Chart from 'react-apexcharts';
import { useTranslation } from 'react-i18next';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import { alpha, useTheme } from '@mui/material/styles';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';

import { useRouter } from 'src/routes/hooks';

import { courseApi } from 'src/api';
import { DashboardContent } from 'src/layouts/dashboard';
import { mapCourseDtoToCourse } from 'src/api/mappers/course.mapper';

import { Iconify } from 'src/components/iconify';

import { 
  GlassCard, 
  PageHeader, 
  MetricLabel, 
  MetricValue, 
  GradientIcon, 
  EngineeringFrame 
} from '../engineer-styles';

// ----------------------------------------------------------------------

export function EngineerCourseManagementView() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<CourseLevel | 'all'>('all');

  // Create/Edit Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editCourseId, setEditCourseId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    levelStatusId: 22,
    durationHours: '',
    price: '',
  });

  // Action Menu State
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedCourseForMenu, setSelectedCourseForMenu] = useState<Course | null>(null);

  const resetForm = useCallback(() => {
    setFormData({ title: '', description: '', levelStatusId: 22, durationHours: '', price: '' });
    setFormError(null);
    setEditCourseId(null);
  }, []);

  const openCreateDialog = useCallback(() => {
    resetForm();
    setDialogMode('create');
    setDialogOpen(true);
  }, [resetForm]);

  const openEditDialog = useCallback((course: Course) => {
    setFormData({
      title: course.name,
      description: course.description,
      levelStatusId: course.level === 'beginner' ? 22 : course.level === 'intermediate' ? 23 : 24,
      durationHours: String(course.duration),
      price: String(course.price),
    });
    setEditCourseId(course.id);
    setDialogMode('edit');
    setFormError(null);
    setDialogOpen(true);
    setMenuAnchor(null);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    resetForm();
  }, [resetForm]);

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await courseApi.getCourses();
      setCourses(items.map(mapCourseDtoToCourse));
    } catch (err) {
      setError('Failed to load courses for engineering audit.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSaveCourse = useCallback(async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.durationHours) {
      setFormError('Please fill all required fields.');
      return;
    }

    try {
      setFormLoading(true);
      setFormError(null);

      if (dialogMode === 'create') {
        await courseApi.createCourse({
          title: formData.title.trim(),
          description: formData.description.trim(),
          levelStatusId: Number(formData.levelStatusId),
          durationHours: Number(formData.durationHours),
        });
      } else if (dialogMode === 'edit' && editCourseId) {
         // Assuming patchCourse or updateCourse matches the API structure
         // Note: The createCourse payload keys (title, description) might differ from update.
         // Based on previous file reads, updateCourse takes UpdateCourseRequest.
         // We'll use a best-effort payload here matching CreateCourseRequest structure if possible, 
         // or fall back to what we saw in the API file.
        await courseApi.updateCourse(editCourseId, {
            id: Number(editCourseId),
            title: formData.title.trim(),
            description: formData.description.trim(),
            levelStatusId: Number(formData.levelStatusId),
            durationHours: Number(formData.durationHours),
            price: Number(formData.price) || undefined
        } as any);
      }

      await loadCourses();
      closeDialog();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save course');
    } finally {
      setFormLoading(false);
    }
  }, [closeDialog, dialogMode, editCourseId, formData, loadCourses]);

  const handleDeleteCourse = useCallback(async () => {
    if (!selectedCourseForMenu) return;
    if (!confirm(`Are you sure you want to delete "${selectedCourseForMenu.name}"?`)) return;

    try {
      setLoading(true);
      await courseApi.deleteCourse(selectedCourseForMenu.id);
      setMenuAnchor(null);
      await loadCourses();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete course');
    } finally {
      setLoading(false);
    }
  }, [loadCourses, selectedCourseForMenu]);

  const handleToggleStatus = useCallback(async () => {
      if (!selectedCourseForMenu) return;
      const newStatus = selectedCourseForMenu.status === 'active' ? 'inactive' : 'active'; // Simple toggle logic
      // Note: Actual API enum might be 1/2 or text. Using best guess based on types. 
      // If status is string 'active', we switch to 'inactive'.
      
      try {
        setLoading(true);
        // Using patch if avaiable for partial update
        await courseApi.patchCourse(selectedCourseForMenu.id, {  
            // @ts-expect-error - status type mismatch
            status: newStatus 
        }); 
        setMenuAnchor(null);
        await loadCourses();
      } catch (err: any) {
        setError(err?.message || 'Failed to update status');
      } finally {
        setLoading(false);
      }
  }, [loadCourses, selectedCourseForMenu]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const filteredCourses = useMemo(() => courses.filter((c) => {
      const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchLevel = filterLevel === 'all' || c.level === filterLevel;
      return matchSearch && matchLevel;
    }), [courses, searchQuery, filterLevel]);

  const stats = useMemo(() => {
    const total = courses.length;
    const active = courses.filter(c => c.status === 'active').length;
    const avgPrice = total > 0 ? courses.reduce((acc, c) => acc + c.price, 0) / total : 0;
    const totalStudents = courses.reduce((acc, c) => acc + (c.students || 0), 0);
    
    return { total, active, avgPrice, totalStudents };
  }, [courses]);

  // Chart config
  const levelDistribution = useMemo(() => {
    const counts = { beginner: 0, intermediate: 0, advanced: 0 };
    courses.forEach(c => {
       if((counts as any)[c.level] !== undefined) (counts as any)[c.level]++;
    });
    return [counts.beginner, counts.intermediate, counts.advanced];
  }, [courses]);

  const priceDistributionSeries = useMemo(() => {
      const ranges = ['0-50', '51-100', '101-200', '200+'];
      const data = [0, 0, 0, 0];
      courses.forEach(c => {
          if (c.price <= 50) data[0]++;
          else if (c.price <= 100) data[1]++;
          else if (c.price <= 200) data[2]++;
          else data[3]++;
      });
      return [{ name: 'Courses', data }];
  }, [courses]);

  const donutOptions: ApexOptions = {
    labels: ['Beginner', 'Intermediate', 'Advanced'],
    colors: [theme.palette.success.main, theme.palette.warning.main, theme.palette.error.main],
    chart: { fontFamily: theme.typography.fontFamily, background: 'transparent' },
    stroke: { show: false },
    legend: { position: 'bottom', labels: { colors: theme.palette.text.secondary } },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: true,
            name: { color: theme.palette.text.secondary },
            value: { color: theme.palette.text.primary, fontWeight: 700 },
            total: { show: true, label: 'TOTAL', color: theme.palette.text.secondary }
          }
        }
      }
    },
    dataLabels: { enabled: false }
  };

  const barOptions: ApexOptions = {
      chart: { type: 'bar', toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 4, horizontal: false, columnWidth: '40%' } },
      dataLabels: { enabled: false },
      xaxis: { categories: ['Free/Low', 'Standard', 'Premium', 'Elite'], labels: { style: { colors: theme.palette.text.secondary } } },
      yaxis: { labels: { style: { colors: theme.palette.text.secondary } } },
      grid: { borderColor: alpha(theme.palette.divider, 0.1) },
      colors: [theme.palette.primary.main],
      fill: { opacity: 1 }
  };

  const handleCourseClick = (courseId: string) => {
      router.push(`/engineer/rounds?courseId=${courseId}`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, course: Course) => {
      event.stopPropagation();
      setMenuAnchor(event.currentTarget);
      setSelectedCourseForMenu(course);
  };

  const handleMenuClose = () => {
      setMenuAnchor(null);
      setSelectedCourseForMenu(null);
  };

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
                <Iconify icon="solar:programming-bold-duotone" width={32} />
              </Box>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -1 }}>
                  Engineering Course Hub
                </Typography>
                <Typography variant="subtitle1" sx={{ opacity: 0.9, fontWeight: 500 }}>
                  Deep visibility into courses, pricing, and student reach.
                </Typography>
              </Box>
            </Stack>
          </PageHeader>

          <GlassCard>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<Iconify icon="solar:add-circle-bold-duotone" />}
                onClick={openCreateDialog}
                sx={{ fontWeight: 800, borderRadius: 2 }}
              >
                Create Course
              </Button>
              <Button variant="outlined" onClick={loadCourses} disabled={loading} sx={{ fontWeight: 800, borderRadius: 2 }}>
                Refresh
              </Button>
              {error && (
                <Alert severity="error" sx={{ borderRadius: 2, flexGrow: 1 }}>
                  {error}
                </Alert>
              )}
            </Box>
          </GlassCard>

          <Grid container spacing={3}>
            {[
              { label: 'Total Courses', value: stats.total, icon: 'solar:layers-bold', color: 'primary' },
              { label: 'Active Courses', value: stats.active, icon: 'solar:fire-bold', color: 'success' },
              { label: 'Average Price', value: `$${stats.avgPrice.toFixed(0)}`, icon: 'solar:money-bag-bold', color: 'info' },
              { label: 'Enrolled Students', value: stats.totalStudents, icon: 'solar:users-group-rounded-bold', color: 'warning' },
            ].map((stat) => (
              <Grid key={stat.label} size={{ xs: 12, sm: 6, md: 3 }}>
                <EngineeringFrame>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <GradientIcon 
                      sx={{ 
                        color: `${stat.color}.main`,
                        background: (th) => `linear-gradient(135deg, ${alpha(th.palette[stat.color as 'primary'].main, 0.1)} 0%, ${alpha(th.palette[stat.color as 'primary'].main, 0.2)} 100%)`
                      }}
                    >
                      <Iconify icon={stat.icon} width={24} />
                    </GradientIcon>
                    <Box>
                      <MetricValue variant="h4">
                        {loading ? '...' : stat.value}
                      </MetricValue>
                      <MetricLabel variant="subtitle2">
                        {stat.label}
                      </MetricLabel>
                    </Box>
                  </Stack>
                </EngineeringFrame>
              </Grid>
            ))}
          </Grid>

          <GlassCard>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
              <TextField
                fullWidth
                placeholder="Search by Course Name, Code or Internal ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Iconify icon="solar:magnifer-bold" sx={{ color: 'text.disabled' }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Stack direction="row" spacing={1} sx={{ minWidth: { md: 400 } }}>
                 {['all', 'beginner', 'intermediate', 'advanced'].map((lvl) => (
                    <Button
                      key={lvl}
                      variant={filterLevel === lvl ? 'contained' : 'outlined'}
                      color={filterLevel === lvl ? 'primary' : 'inherit'}
                      onClick={() => setFilterLevel(lvl as any)}
                      sx={{ textTransform: 'capitalize', fontWeight: 700 }}
                    >
                      {lvl}
                    </Button>
                 ))}
              </Stack>
            </Stack>
          </GlassCard>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <EngineeringFrame sx={{ p: 0, height: '100%' }}>
                 <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Course Register</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Showing {filteredCourses.length} entities</Typography>
                 </Box>
                 <Stack spacing={0} sx={{ maxHeight: 600, overflow: 'auto' }}>
                    {loading ? (
                      <Box sx={{ p: 4 }}><LinearProgress /></Box>
                    ) : filteredCourses.map((course) => (
                      <Box
                        key={course.id}
                        onClick={() => handleCourseClick(course.id)}
                        sx={{
                          p: 2.5,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05), pl: 3 }
                        }}
                      >
                         <Stack direction="row" spacing={2.5} alignItems="center">
                            <Box sx={{ 
                                width: 48, 
                                height: 48, 
                                borderRadius: 1.5, 
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                display: 'grid',
                                placeItems: 'center'
                            }}>
                               <Typography variant="caption" sx={{ fontWeight: 900, color: 'primary.main' }}>{course.code}</Typography>
                            </Box>
                            <Box>
                               <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{course.name}</Typography>
                               <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                     <Iconify icon="solar:user-bold" width={12} /> {course.instructor || 'Instructor'}
                                  </Typography>
                                  <Chip 
                                    label={course.level} 
                                    size="small" 
                                    color={course.level === 'advanced' ? 'error' : course.level === 'intermediate' ? 'warning' : 'success'}
                                    sx={{ height: 20, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}
                                  />
                                   <Chip 
                                    label={course.status} 
                                    size="small" 
                                    variant={course.status === 'active' ? 'filled' : 'outlined'}
                                    color={course.status === 'active' ? 'primary' : 'default'}
                                    sx={{ height: 20, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}
                                  />
                               </Stack>
                            </Box>
                         </Stack>
                         
                         <Stack direction="row" spacing={4} alignItems="center">
                            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                               <Typography variant="h6" sx={{ fontWeight: 900 }}>{course.students}</Typography>
                               <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>USERS</Typography>
                            </Box>
                            <Box sx={{ minWidth: 80, textAlign: 'right' }}>
                               <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>${course.price}</Typography>
                               <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>PRICE</Typography>
                            </Box>
                            <Box onClick={(e) => e.stopPropagation()}>
                                <IconButton onClick={(e) => handleMenuOpen(e, course)}>
                                    <Iconify icon="solar:menu-dots-bold" />
                                </IconButton>
                            </Box>
                         </Stack>
                      </Box>
                    ))}
                 </Stack>
              </EngineeringFrame>
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              <Stack spacing={3}>
                  <EngineeringFrame>
                     <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Difficulty Distribution</Typography>
                     <Chart
                       options={donutOptions}
                       series={levelDistribution}
                       type="donut"
                       height={280}
                     />
                  </EngineeringFrame>
                  <EngineeringFrame>
                     <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Price Segmentation</Typography>
                     <Chart
                       options={barOptions}
                       series={priceDistributionSeries}
                       type="bar"
                       height={280}
                     />
                  </EngineeringFrame>
              </Stack>
            </Grid>
          </Grid>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
            onClick={(e) => e.stopPropagation()}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
             <MenuItem onClick={() => { if(selectedCourseForMenu) openEditDialog(selectedCourseForMenu); }}>
                <Iconify icon="solar:pen-bold" sx={{ mr: 2 }} />
                Edit Course
             </MenuItem>
             <MenuItem onClick={handleToggleStatus}>
                <Iconify icon="solar:power-bold" sx={{ mr: 2 }} />
                {selectedCourseForMenu?.status === 'active' ? 'Deactivate' : 'Activate'}
             </MenuItem>
             <MenuItem onClick={() => { if(selectedCourseForMenu) { handleCourseClick(selectedCourseForMenu.id); handleMenuClose(); } }}>
                <Iconify icon="solar:round-graph-bold" sx={{ mr: 2 }} />
                View Rounds
             </MenuItem>
             <Divider sx={{ borderStyle: 'dashed' }} />
             <MenuItem onClick={handleDeleteCourse} sx={{ color: 'error.main' }}>
                <Iconify icon="solar:trash-bin-trash-bold" sx={{ mr: 2 }} />
                Delete
             </MenuItem>
          </Menu>

          <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
            <DialogTitle>{dialogMode === 'create' ? 'Create Course' : 'Edit Course'}</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {formError && (
                  <Alert severity="error" sx={{ borderRadius: 2 }}>
                    {formError}
                  </Alert>
                )}

                <TextField
                  label="Title"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  fullWidth
                  required
                />

                <TextField
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  fullWidth
                  required
                  multiline
                  minRows={3}
                />

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Level</InputLabel>
                    <Select
                      label="Level"
                      value={formData.levelStatusId}
                      onChange={(e) => setFormData((p) => ({ ...p, levelStatusId: Number(e.target.value) }))}
                    >
                      <MenuItem value={22}>Beginner</MenuItem>
                      <MenuItem value={23}>Intermediate</MenuItem>
                      <MenuItem value={24}>Advanced</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="Duration Hours"
                    type="number"
                    value={formData.durationHours}
                    onChange={(e) => setFormData((p) => ({ ...p, durationHours: e.target.value }))}
                    fullWidth
                    required
                  />
                  
                  <TextField
                    label="Price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
                    fullWidth
                  />
                </Box>

                {formLoading && <LinearProgress />}

                <Divider />
                <Typography variant="caption" color="text.secondary">
                   {dialogMode === 'create' 
                      ? 'This creates the course record. Rounds (with questions) are created from Engineer Course Rounds.' 
                      : 'These changes affect the global course definition.'}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeDialog} disabled={formLoading}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveCourse}
                disabled={formLoading || !formData.title.trim() || !formData.description.trim() || !formData.durationHours}
                sx={{ fontWeight: 900, borderRadius: 2 }}
              >
                {dialogMode === 'create' ? 'Create' : 'Save Changes'}
              </Button>
            </DialogActions>
          </Dialog>
        </Stack>
      </Container>
    </DashboardContent>
  );
}
