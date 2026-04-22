import type { AxiosResponse } from 'axios';

import http from '../http';

import type { EngineerDashboardDto } from '../models/engineer-dashboard';

const unwrap = <T>(res: AxiosResponse<T>): T => res.data;

export const engineerDashboardApi = {
  getDashboard: async (): Promise<EngineerDashboardDto> => {
    const res = await http.get<EngineerDashboardDto>('/api/EngineerDashboard');
    return unwrap(res);
  },
};
