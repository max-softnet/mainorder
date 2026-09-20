import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ClientFormPage from './pages/ClientFormPage';
import ClientViewPage from './pages/ClientViewPage';
import CarriersPage from './pages/CarriersPage';
import CarrierFormPage from './pages/CarrierFormPage';
import CarrierViewPage from './pages/CarrierViewPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import WorkOrderFormPage from './pages/WorkOrderFormPage';
import WorkOrderViewPage from './pages/WorkOrderViewPage';
import SettingsPage from './pages/SettingsPage';
import StatisticsPage from './pages/StatisticsPage';
import RoutesPage from './pages/RoutesPage';
import BillingPage from './pages/BillingPage';
import UsersPage from './pages/UsersPage';
import MailLogsPage from './pages/MailLogsPage';
import AccessLogsPage from './pages/AccessLogsPage';
import FicSyncPage from './pages/FicSyncPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />

          {/* Ordini */}
          <Route path="/work-orders" element={<PrivateRoute><WorkOrdersPage /></PrivateRoute>} />
          <Route path="/work-orders/:id" element={<PrivateRoute><WorkOrderViewPage /></PrivateRoute>} />
          <Route path="/work-orders/new" element={<PrivateRoute roles={['admin','operatore']}><WorkOrderFormPage /></PrivateRoute>} />
          <Route path="/work-orders/:id/edit" element={<PrivateRoute roles={['admin','operatore']}><WorkOrderFormPage /></PrivateRoute>} />

          {/* Clienti */}
          <Route path="/clients" element={<PrivateRoute roles={['admin','operatore']}><ClientsPage /></PrivateRoute>} />
          <Route path="/clients/:id" element={<PrivateRoute roles={['admin','operatore']}><ClientViewPage /></PrivateRoute>} />
          <Route path="/clients/new" element={<PrivateRoute roles={['admin','operatore']}><ClientFormPage /></PrivateRoute>} />
          <Route path="/clients/:id/edit" element={<PrivateRoute roles={['admin','operatore']}><ClientFormPage /></PrivateRoute>} />

          {/* Trasportatori */}
          <Route path="/carriers" element={<PrivateRoute roles={['admin','operatore']}><CarriersPage /></PrivateRoute>} />
          <Route path="/carriers/:id" element={<PrivateRoute roles={['admin','operatore']}><CarrierViewPage /></PrivateRoute>} />
          <Route path="/carriers/new" element={<PrivateRoute roles={['admin','operatore']}><CarrierFormPage /></PrivateRoute>} />
          <Route path="/carriers/:id/edit" element={<PrivateRoute roles={['admin','operatore']}><CarrierFormPage /></PrivateRoute>} />

          {/* Tratte */}
          <Route path="/routes" element={<PrivateRoute roles={['admin','operatore']}><RoutesPage /></PrivateRoute>} />

          {/* Fatturazione */}
          <Route path="/billing" element={<PrivateRoute roles={['admin','operatore']}><BillingPage /></PrivateRoute>} />

          {/* Statistiche */}
          <Route path="/statistics" element={<PrivateRoute roles={['admin','operatore']}><StatisticsPage /></PrivateRoute>} />

          {/* Utenti (solo admin) */}
          <Route path="/users" element={<PrivateRoute roles={['admin']}><UsersPage /></PrivateRoute>} />
          <Route path="/mail-logs" element={<PrivateRoute roles={['admin']}><MailLogsPage /></PrivateRoute>} />
          <Route path="/access-logs" element={<PrivateRoute roles={['admin']}><AccessLogsPage /></PrivateRoute>} />
          <Route path="/fic-sync" element={<PrivateRoute roles={['admin']}><FicSyncPage /></PrivateRoute>} />

          {/* Impostazioni (solo admin) */}
          <Route path="/settings" element={<PrivateRoute roles={['admin']}><SettingsPage /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
