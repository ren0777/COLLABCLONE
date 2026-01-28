import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './Login';
import AdminDashboard from './admin/AdminDashboard';
import { jwtDecode } from 'jwt-decode';

function App() {
  const [token, setToken] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      try {
        const decodedToken = jwtDecode(storedToken);
        setUserRole(decodedToken.role);
        createSession(storedToken);
      } catch (err) {
        console.error('Failed to decode token:', err);
        handleLogout();
      }
    }
  }, []);

  useEffect(() => {
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        setUserRole(decodedToken.role);
      } catch (err) {
        console.error('Failed to decode token on update:', err);
        setUserRole(null);
      }
    } else {
      setUserRole(null);
    }
  }, [token]);

  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    try {
      const decodedToken = jwtDecode(newToken);
      setUserRole(decodedToken.role);
      // Create a new session immediately after login
      createSession(newToken);
    } catch (err) {
      console.error('Failed to decode new token:', err);
      setUserRole(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setSessionToken(null);
    setUserRole(null);
  };

  const createSession = async (currentToken = token) => {
    setLoading(true);
    setError(null);
    
    if (!currentToken) {
      setError('No authentication token found. Please log in.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/session/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: currentToken }),
      });
      
      if (!res.ok) {
        let errorMessage = `HTTP error! status: ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
          console.error('API Error Response:', errorData);
        } catch (e) {
          console.error('API Error Response (non-JSON):', e);
        }
        
        if (res.status === 401) {
          console.error('401 Unauthorized error detected. Logging out.');
          handleLogout();
          setError('Session expired. Please log in again.');
          return;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      setSessionToken(data.sessionToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
        <nav style={{ backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937' }}>Mini Colab — Starter</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {userRole === 'admin' && (
              <Link to="/admin" style={{ color: '#2563eb', textDecoration: 'none' }}>Admin Dashboard</Link>
            )}
            <button onClick={handleLogout} style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white', color: '#4b5563', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        </nav>

        <main style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{ backgroundColor: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', padding: '12px 16px', borderRadius: '4px', position: 'relative', marginBottom: '1rem' }} role="alert">
              <strong style={{ fontWeight: 'bold' }}>Error!</strong>
              <span style={{ display: 'block' }}> {error}</span>
            </div>
          )}

          <Routes>
            <Route path="/admin" element={userRole === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} />
            <Route path="/" element={
              <>
                {!sessionToken ? (
                  <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <button 
                      onClick={() => createSession()}
                      disabled={loading}
                      style={{ padding: '12px 24px', fontSize: '1.125rem', fontWeight: '500', borderRadius: '6px', color: 'white', backgroundColor: loading ? '#9ca3af' : '#2563eb', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
                    >
                      {loading ? 'Starting Notebook...' : 'New Notebook'}
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: '2rem' }}>
                    <p style={{ color: '#374151', fontSize: '1.125rem', marginBottom: '1rem' }}>Session created! Loading Jupyter Lab...</p>
                    <div style={{ position: 'relative', overflow: 'hidden', paddingTop: '56.25%', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                      <iframe
                        title="Jupyter Lab"
                        src={`http://localhost:9998/jupyter/lab?session=${sessionToken}`}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </>
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
