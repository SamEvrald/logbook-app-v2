import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import RoleSelectionPage from "./pages/RoleSelectionPage";
import StudentLoginPage from "./pages/StudentLoginPage";
import TeacherLoginPage from "./pages/TeacherLoginPage";
import TeacherSignupPage from "./pages/TeacherSignupPage";
import AdminLoginPage from "./pages/AdminLoginPage"; // ✅ Ensure Admin Login is imported
import AdminSignupPage from "./pages/AdminSignupPage"; // ✅ Ensure Admin Signup is imported
import AdminDashboard from "./pages/AdminDashboard"; // ✅ Ensure Admin Dashboard is imported
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import NewEntryForm from "./components/Student/NewEntryForm";
import GradeEntryForm from "./components/Teacher/GradeEntryForm";
import PrivateRoute from "./components/Shared/PrivateRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleSelectionPage />} />
        <Route path="/login/student" element={<StudentLoginPage />} />
        <Route path="/login/teacher" element={<TeacherLoginPage />} />
        <Route path="/signup/teacher" element={<TeacherSignupPage />} />
        <Route path="/login/admin" element={<AdminLoginPage />} />
        <Route path="/signup/admin" element={<AdminSignupPage />} />
        <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
        <Route path="/student" element={<PrivateRoute><StudentDashboard /></PrivateRoute>} />
        <Route path="/student/new-entry" element={<PrivateRoute><NewEntryForm /></PrivateRoute>} />
        <Route path="/teacher" element={<PrivateRoute><TeacherDashboard /></PrivateRoute>} />
        <Route path="/teacher/grade/:entryId" element={<PrivateRoute><GradeEntryForm /></PrivateRoute>} />
        <Route path="*" element={<RoleSelectionPage />} />
  
        

      </Routes>
    </BrowserRouter>
  );
}

export default App;
