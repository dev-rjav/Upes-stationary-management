import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import ReceptionistLayout from "./components/layout/ReceptionistLayout";
import Login from "./pages/receptionist/Login";
import Dashboard from "./pages/receptionist/Dashboard";
import Requests from "./pages/receptionist/Requests";
import Stock from "./pages/receptionist/Stock";
import StockIn from "./pages/receptionist/StockIn";
import Items from "./pages/receptionist/Items";
import Reports from "./pages/receptionist/Reports";
import ManualRequest from "./pages/receptionist/ManualRequest";
import Teachers from "./pages/receptionist/Teachers";
import RequestForm from "./pages/RequestForm";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/request" element={<RequestForm />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/receptionist"
          element={
            <ProtectedRoute>
              <ReceptionistLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/receptionist/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="requests" element={<Requests />} />
          <Route path="stock" element={<Stock />} />
          <Route path="stock-in" element={<StockIn />} />
          <Route path="items" element={<Items />} />
          <Route path="reports" element={<Reports />} />
          <Route path="manual-request" element={<ManualRequest />} />
          <Route path="teachers" element={<Teachers />} />
        </Route>
        <Route path="*" element={<Navigate to="/request" replace />} />
      </Routes>
    </BrowserRouter>
  );
}