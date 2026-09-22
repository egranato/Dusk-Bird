import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import LoginPage from './pages/LoginPage';
import GalleryPage from './pages/GalleryPage';
import AdminPage from './pages/AdminPage';
import TaggingPage from './pages/TaggingPage';
import FilesPage from './pages/FilesPage';
import MediaDetailPage from './pages/MediaDetailPage';

export default function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={token ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <GalleryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tagging"
        element={
          <ProtectedRoute>
            <TaggingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/files"
        element={
          <ProtectedRoute>
            <FilesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/media/:id"
        element={
          <ProtectedRoute>
            <MediaDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
