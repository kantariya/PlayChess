// client/src/layouts/AuthLayout.jsx
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Outlet } from "react-router-dom";
import Loader from "../components/Loader"; // Import Loader

const AuthLayout = () => {
  const { user, loadingAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loadingAuth && user) {
      navigate("/");
    }
  }, [user, loadingAuth, navigate]);

  if (loadingAuth) {
    return <Loader message="Checking credentials..." />; // Use Loader
  }

  return !user ? (
    <div className="min-h-screen bg-gray-800 text-gray-200">
      <div className="max-w-full mx-auto p-4">
        <Outlet />
      </div>
    </div>
  ) : null;
};
export default AuthLayout;