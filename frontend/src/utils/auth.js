export const getToken = () => localStorage.getItem('token');

export const getAuthConfig = () => ({
  headers: {
    Authorization: `Bearer ${getToken()}`
  }
});

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch (error) {
    return null;
  }
};

export const MANAGEMENT_ROLES = [
  'director',
  'hr',
  'production_manager',
  'department_head',
  'shift_supervisor'
];

export const DIRECTOR_ONLY_ROLES = ['director'];
export const REPORT_VIEW_ROLES = ['director', 'hr'];

export const isManagementRole = (role) =>
  MANAGEMENT_ROLES.includes(role);

export const isWorkerRole = (role) => role === 'worker';

export const getHomePathForRole = (role) => (role ? '/dashboard' : '/login');
