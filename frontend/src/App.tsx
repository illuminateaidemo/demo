import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import OpportunitiesPage from './pages/OpportunitiesPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ResourcesPage from './pages/ResourcesPage';
import TimesheetsPage from './pages/TimesheetsPage';
import ExpensesPage from './pages/ExpensesPage';
import FinancePage from './pages/FinancePage';
import ApprovalsPage from './pages/ApprovalsPage';
import AdminPage from './pages/AdminPage';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

const RoleRoute: React.FC<{ roles: string[]; children: React.ReactNode }> = ({ roles, children }) => {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/opportunities" element={<OpportunitiesPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/timesheets" element={<TimesheetsPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/finance" element={
              <RoleRoute roles={['ADMIN', 'FINANCE']}>
                <FinancePage />
              </RoleRoute>
            } />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/admin" element={
              <RoleRoute roles={['ADMIN']}>
                <AdminPage />
              </RoleRoute>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
