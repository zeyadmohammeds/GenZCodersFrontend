import '@testing-library/jest-dom';

import React from 'react';
import { it, vi, expect, describe, beforeEach } from 'vitest';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';

// Component under test
import { EngineerCourseManagementView } from './engineer-course-management-view';

// Mocks for external modules
vi.mock('react-apexcharts', () => ({ default: () => <div data-testid="chart" /> }));

vi.mock('src/routes/hooks', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('src/api', () => ({
  courseApi: {
    getCourses: vi.fn(),
    createCourse: vi.fn(),
    updateCourse: vi.fn(),
    patchCourse: vi.fn(),
    deleteCourse: vi.fn(),
  },
}));

vi.mock('src/api/mappers/course.mapper', () => ({
  mapCourseDtoToCourse: (dto: any) => dto,
}));

vi.mock('react-i18next', async () => ({
  ...(await vi.importActual<any>('react-i18next')),
  useTranslation: () => ({ t: (k: string) => k }),
}));

// Minimal MUI theme context wrapper if needed can be added in the future

const sampleCourses = [
  {
    id: '1',
    code: 'CRS-001',
    name: 'Intro to Testing',
    description: 'Basics',
    level: 'beginner',
    status: 'active',
    duration: 10,
    price: 25,
    students: 12,
    instructor: 'Alice',
  },
  {
    id: '2',
    code: 'CRS-002',
    name: 'Advanced React',
    description: 'Hooks deep dive',
    level: 'advanced',
    status: 'inactive',
    duration: 20,
    price: 220,
    students: 5,
    instructor: 'Bob',
  },
];

describe('EngineerCourseManagementView', async () => {
  const { courseApi } = vi.mocked(await import('src/api')) as any;

  beforeEach(() => {
    vi.clearAllMocks();
    courseApi.getCourses.mockResolvedValue([...sampleCourses]);
  });

  it('loads and displays stats and the course list', async () => {
    render(<EngineerCourseManagementView />);

    // Shows loading first
    expect(screen.getAllByText('...').length).toBeGreaterThan(0);

    // Wait for courses to load
    await waitFor(() => expect(courseApi.getCourses).toHaveBeenCalled());

    // Stats derived from sampleCourses
    expect(screen.getByText('Total Courses')).toBeInTheDocument();
    expect(screen.getByText('Active Courses')).toBeInTheDocument();
    expect(screen.getByText('Average Price')).toBeInTheDocument();
    expect(screen.getByText('Enrolled Students')).toBeInTheDocument();

    // List items render
    expect(screen.getByText('Intro to Testing')).toBeInTheDocument();
    expect(screen.getByText('Advanced React')).toBeInTheDocument();
  });

  it('filters by search and level', async () => {
    render(<EngineerCourseManagementView />);
    await waitFor(() => expect(courseApi.getCourses).toHaveBeenCalled());

    // Search by name
    fireEvent.change(screen.getByPlaceholderText('Search by Course Name, Code or Internal ID...'), {
      target: { value: 'Intro' },
    });

    expect(screen.getByText('Intro to Testing')).toBeInTheDocument();
    expect(screen.queryByText('Advanced React')).not.toBeInTheDocument();

    // Reset search
    fireEvent.change(screen.getByPlaceholderText('Search by Course Name, Code or Internal ID...'), {
      target: { value: '' },
    });

    // Filter by level: advanced
    fireEvent.click(screen.getByRole('button', { name: 'advanced' }));

    expect(screen.getByText('Advanced React')).toBeInTheDocument();
    expect(screen.queryByText('Intro to Testing')).not.toBeInTheDocument();
  });

  it('creates a new course via dialog and refreshes list', async () => {
    render(<EngineerCourseManagementView />);
    await waitFor(() => expect(courseApi.getCourses).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Create Course' }));

    // Fill form
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New Course' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Desc' } });
    fireEvent.change(screen.getByLabelText('Duration Hours'), { target: { value: '5' } });

    courseApi.createCourse.mockResolvedValueOnce({});
    courseApi.getCourses.mockResolvedValueOnce([...sampleCourses, {
      ...sampleCourses[0], id: '3', name: 'New Course', code: 'CRS-003'
    }]);

    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(courseApi.createCourse).toHaveBeenCalledWith({
      title: 'New Course',
      description: 'Desc',
      levelStatusId: 22,
      durationHours: 5,
    }));

    await waitFor(() => expect(courseApi.getCourses).toHaveBeenCalledTimes(2));
    expect(screen.getByText('New Course')).toBeInTheDocument();
  });

  it('edits an existing course and refreshes list', async () => {
    render(<EngineerCourseManagementView />);
    await waitFor(() => expect(courseApi.getCourses).toHaveBeenCalled());

    // Open action menu for first course by clicking its menu button
    const rows = screen.getAllByText(/PRICE$/i).map((el: any) => el.closest('div'));
    const firstRow = rows[0]!.parentElement!.parentElement!; // navigate to row container
    const menuButton = within(firstRow).getByRole('button');

    fireEvent.click(menuButton);
    fireEvent.click(screen.getByRole('menuitem', { name: /Edit Course/i }));

    // Change title and save
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Intro to Testing - Updated' } });

    courseApi.updateCourse.mockResolvedValueOnce({});
    courseApi.getCourses.mockResolvedValueOnce([
      { ...sampleCourses[0], name: 'Intro to Testing - Updated' },
      sampleCourses[1],
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(courseApi.updateCourse).toHaveBeenCalled());
    await waitFor(() => expect(courseApi.getCourses).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Intro to Testing - Updated')).toBeInTheDocument();
  });

  it('toggles status and deletes a course from action menu', async () => {
    render(<EngineerCourseManagementView />);
    await waitFor(() => expect(courseApi.getCourses).toHaveBeenCalled());

    // Open action menu for second course (inactive)
    const priceCaptions = screen.getAllByText('PRICE');
    const secondRow = priceCaptions[1]!.closest('div')!.parentElement!.parentElement!;
    const secondMenuButton = within(secondRow).getByRole('button');

    fireEvent.click(secondMenuButton);

    // Toggle status
    courseApi.patchCourse.mockResolvedValueOnce({});
    courseApi.getCourses.mockResolvedValueOnce([
      sampleCourses[0],
      { ...sampleCourses[1], status: 'active' },
    ]);

    fireEvent.click(screen.getByRole('menuitem', { name: /Activate|Deactivate/ }));
    await waitFor(() => expect(courseApi.patchCourse).toHaveBeenCalled());

    // Re-open menu and delete
    fireEvent.click(secondMenuButton);

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(true);

    courseApi.deleteCourse.mockResolvedValueOnce({});
    courseApi.getCourses.mockResolvedValueOnce([sampleCourses[0]]);

    fireEvent.click(screen.getByRole('menuitem', { name: /Delete/i }));

    await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
    await waitFor(() => expect(courseApi.deleteCourse).toHaveBeenCalledWith('2'));
    await waitFor(() => expect(courseApi.getCourses).toHaveBeenCalledTimes(3));
    expect(screen.queryByText('Advanced React')).not.toBeInTheDocument();
  });
});
