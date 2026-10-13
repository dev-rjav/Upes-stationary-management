import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import RequestForm from './pages/RequestForm';
import Login from './pages/receptionist/Login';
import ReceptionistLayout from './components/layout/ReceptionistLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Requests from './pages/receptionist/Requests';
import ManualRequest from './pages/receptionist/ManualRequest';
import Stock from './pages/receptionist/Stock';
import StockIn from './pages/receptionist/StockIn';
import Dashboard from './pages/receptionist/Dashboard';
import Reports from './pages/receptionist/Reports';
import Items from './pages/receptionist/Items';
import Settings from './pages/receptionist/Settings';
import QRDisplay from './pages/QRDisplay';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/request" element={<RequestForm />} />
            <Route path="/qr" element={<QRDisplay />} />
            <Route path="/login" element={<Login />} />
            <Route path="/receptionist" element={
              <ProtectedRoute><ReceptionistLayout /></ProtectedRoute>
            }>
              <Route index element={<Navigate to="/receptionist/requests" replace />} />
              <Route path="requests" element={<Requests />} />
              <Route path="requests/new" element={<ManualRequest />} />
              <Route path="stock" element={<Stock />} />
              <Route path="stock-in" element={<StockIn />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="reports" element={<Reports />} />
              <Route path="items" element={<Items />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/request" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
