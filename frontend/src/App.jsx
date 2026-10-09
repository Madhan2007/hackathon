import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import QueuePage from './pages/QueuePage';
import ExceptionsPage from './pages/ExceptionsPage';
import DoctorSummary from './pages/DoctorSummary';
import PatientsPage from './pages/PatientsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SimulatorPage from './pages/SimulatorPage';
import UsersManagementPage from './pages/UsersManagementPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Protected Clinical Workspace Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Today's Queue: Admin, Coordinator, Nurse */}
            <Route
              index
              element={
                <ProtectedRoute allowedRoles={['admin', 'coordinator', 'nurse']}>
                  <QueuePage />
                </ProtectedRoute>
              }
            />

            {/* Exception Queue: All clinical roles */}
            <Route
              path="exceptions"
              element={
                <ProtectedRoute allowedRoles={['admin', 'doctor', 'coordinator', 'nurse']}>
                  <ExceptionsPage />
                </ProtectedRoute>
              }
            />

            {/* Doctor Summary: Admin, Doctor */}
            <Route
              path="doctor"
              element={
                <ProtectedRoute allowedRoles={['admin', 'doctor']}>
                  <DoctorSummary />
                </ProtectedRoute>
              }
            />

            {/* Patients & Cycles: All clinical roles */}
            <Route
              path="patients"
              element={
                <ProtectedRoute allowedRoles={['admin', 'doctor', 'coordinator', 'nurse']}>
                  <PatientsPage />
                </ProtectedRoute>
              }
            />

            {/* Analytics: Admin, Doctor */}
            <Route
              path="analytics"
              element={
                <ProtectedRoute allowedRoles={['admin', 'doctor']}>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />

            {/* AI WhatsApp Simulator: Admin, Coordinator */}
            <Route
              path="simulator"
              element={
                <ProtectedRoute allowedRoles={['admin', 'coordinator']}>
                  <SimulatorPage />
                </ProtectedRoute>
              }
            />

            {/* Clinic Staff & RBAC Management: Admin only */}
            <Route
              path="admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UsersManagementPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback inside dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

          {/* Global Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
