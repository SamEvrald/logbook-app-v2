import React, { useState, useEffect } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import TopBar from "../components/Shared/TopBar";

const StudentLoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [moodleInstances, setMoodleInstances] = useState([]); 
  const [selectedInstance, setSelectedInstance] = useState(""); 
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // Fetch Moodle instances from backend
  useEffect(() => {
    const fetchMoodleInstances = async () => {
      try {
        console.log(" Fetching Moodle instances...");
        const response = await API.get("/moodle/instances");
        console.log(" Moodle Instances Fetched:", response.data);
        setMoodleInstances(response.data);
      } catch (error) {
        console.error("❌ Failed to fetch Moodle instances:", error.response?.data || error.message);
      }
    };

    fetchMoodleInstances();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
  
    if (!selectedInstance) {
      setError("❌ Please select a Moodle instance.");
      return;
    }
  
    
    const selectedInstanceObj = moodleInstances.find(instance => instance.base_url === selectedInstance);
    if (!selectedInstanceObj) {
      setError("❌ Selected Moodle instance not found.");
      return;
    }
  
    console.log("🚀 Sending login request with:", { username, password, moodle_instance_id: selectedInstanceObj.id });
  
    try {
      const response = await API.post("/auth/login", {
        username,
        password,
        moodle_instance_id: selectedInstanceObj.id,  
      });
  
      console.log(" Received Backend Response:", response.data);
  
      const { token, user, courses, moodle_instance_id } = response.data;
  
      if (!user || !user.moodle_id) {
        throw new Error("Invalid login response: Moodle ID is missing.");
      }
  
      // Store data in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("courses", JSON.stringify(courses));
  
      if (moodle_instance_id) {
        localStorage.setItem("moodle_instance_id", moodle_instance_id.toString()); 
        console.log(" Stored Moodle Instance ID:", moodle_instance_id);
      } else {
        console.warn(" Moodle Instance ID not found in response.");
      }
  
      console.log(" Login successful:", user);
      navigate("/student");
    } catch (err) {
      console.error("❌ Login error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Invalid credentials or server error.");
    }
  };
  

  

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", textAlign: "center" }}>
      <TopBar />
      <h2>Student Login</h2>
      <form onSubmit={handleLogin}>
        {error && <p style={{ color: "red" }}>{error}</p>}

      
        <div>
          <label>Select Program:</label>
          <select value={selectedInstance} onChange={(e) => setSelectedInstance(e.target.value)} required>
            <option value="">Select Program</option>
            {moodleInstances.map((instance) => (
              <option key={instance.id} value={instance.base_url}>
                {instance.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Moodle Username" required />
        </div>

        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Moodle Password" required />
        </div>

        <button type="submit">Login</button>
      </form>
      <Footer />
    </div>
  );
};

export default StudentLoginPage;
