// client/src/App.jsx

import { Routes, Route } from "react-router-dom";
import { Toaster } from 'react-hot-toast';

// Import Layouts
import MainLayout from "./layouts/MainLayout.jsx";
import ProtectLayout from "./layouts/ProtectLayout.jsx";
import AuthLayout from "./layouts/AuthLayout.jsx";

// Import Pages
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import GamePage from "./pages/GamePage.jsx";
import GameReplay from "./pages/GameReplay.jsx";



const App = () => {
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        {/* Public routes that only show for logged-out users */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected routes that require a user to be logged in */}
        <Route element={<MainLayout />}>
          <Route element={<ProtectLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/replay/:gameId" element={<GameReplay />} />
            {/* Add other protected routes here later */}
            {/* e.g., <Route path="/profile" element={<ProfilePage />} /> */}
          </Route>
        </Route>

         {/* Protected route for the GamePage that uses its OWN layout */}
        <Route element={<ProtectLayout />}>
            <Route path="/game/:gameId" element={<GamePage />} />
        </Route>

        {/* Fallback for any other route */}
        <Route path="*" element={
            <div className="flex items-center justify-center h-screen text-white">
                404 - Page Not Found
            </div>
        } />
      </Routes>
    </>
  );
};

export default App;