import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getStoredUser } from '../utils/auth';

export default function PrivateRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const user = getStoredUser();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children || <Outlet />;
}
