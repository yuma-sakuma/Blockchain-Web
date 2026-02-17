import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { UserRole } from './auth/roles';
import { DevTools } from './components/DevTools';
import { Layout } from './components/Layout';
import { PrivateRoute } from './components/PrivateRoute';
import { ConsumerPage } from './pages/ConsumerPage';
import { DealerPage } from './pages/DealerPage';
import { DLTPage } from './pages/DLTPage';
import { FinancePage } from './pages/FinancePage';
import { InspectionPage } from './pages/InspectionPage';
import { InsurancePage } from './pages/InsurancePage';
import { LoginPage } from './pages/LoginPage';
import { ManufacturerPage } from './pages/ManufacturerPage';
import { OverviewPage } from './pages/OverviewPage';
import { ServicePage } from './pages/ServicePage';
import { VehicleProvider } from './store';

function App() {
  return (
    <VehicleProvider>
      <AuthProvider>
        <DevTools />
        <Layout>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            {/* Public or General Authenticated Routes */}
            <Route path="/" element={
              <PrivateRoute>
                <OverviewPage />
              </PrivateRoute>
            } />

            {/* Role Specific Routes */}
            <Route path="/manufacturer" element={
              <PrivateRoute allowedRoles={[UserRole.MANUFACTURER]}>
                <ManufacturerPage />
              </PrivateRoute>
            } />
            
            <Route path="/dealer" element={
              <PrivateRoute allowedRoles={[UserRole.DEALER]}>
                <DealerPage />
              </PrivateRoute>
            } />
            
            <Route path="/consumer" element={
              <PrivateRoute allowedRoles={[UserRole.CONSUMER]}>
                <ConsumerPage />
              </PrivateRoute>
            } />
            
            <Route path="/dlt" element={
              <PrivateRoute allowedRoles={[UserRole.DLT_OFFICER]}>
                <DLTPage />
              </PrivateRoute>
            } />
            
            <Route path="/service" element={
              <PrivateRoute allowedRoles={[UserRole.SERVICE_PROVIDER]}>
                <ServicePage />
              </PrivateRoute>
            } />
            
            <Route path="/inspection" element={
              <PrivateRoute allowedRoles={[UserRole.INSPECTOR]}>
                <InspectionPage />
              </PrivateRoute>
            } />
            
            <Route path="/finance" element={
              <PrivateRoute allowedRoles={[UserRole.LENDER]}>
                <FinancePage />
              </PrivateRoute>
            } />
            
            <Route path="/insurance" element={
              <PrivateRoute allowedRoles={[UserRole.INSURER]}>
                <InsurancePage />
              </PrivateRoute>
            } />
            
          </Routes>
        </Layout>
      </AuthProvider>
    </VehicleProvider>
  );
}

export default App;
