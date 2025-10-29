import { useAuth } from "../context/AuthContext";
import { Navigate, Outlet } from "react-router-dom";
import Loader from "../components/Loader"; // Import Loader

const ProtectLayout = () => {
  const { user, loadingAuth } = useAuth();

  if (loadingAuth) {
    return <Loader message="Verifying session..." />; // Use Loader
  }
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};
export default ProtectLayout;