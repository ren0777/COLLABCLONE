import React, { useState, useEffect } from 'react';
import Login from './Login';

function App() {
  const [token, setToken] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      createSession(); // Call createSession if a token is found
    }
  }, []);

  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setSessionToken(null);
  };

  const createSession = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/session/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
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
        
        // If it's a 401, log out and set a specific error message
        if (res.status === 401) {
          console.error('401 Unauthorized error detected. Logging out.');
          localStorage.removeItem('token');
          setToken(null);
          setSessionToken(null);
          // Set the error message and return to prevent further processing
          setError('Session expired. Please log in again.');
          return; // Exit the function after logout
        }
        
        // For other errors, throw the error to be caught by the outer catch block
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      setSessionToken(data.sessionToken);
    } catch (err) {
      setError(err.message); // This will now be the more specific message from the server or the generic one
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Mini Colab — Starter</h1>
        <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #ccc', padding: '8px 12px', borderRadius: 4, cursor: 'pointer' }}>
          Logout
        </button>
      </div>
      
      {error && (
        <div style={{ color: 'red', marginBottom: 10, padding: 10, border: '1px solid red', borderRadius: 4, backgroundColor: '#fee' }}>
          Error: {error}
        </div>
      )}
      
      {!sessionToken ? (
        <div>
          <button 
            onClick={createSession} 
            disabled={loading}
            style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: loading ? '#ccc' : '#007cba', color: 'white', border: 'none', borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Starting...' : 'New Notebook'}
          </button>
        </div>
      ) : (
        <div>
          <p>Session created! Loading Jupyter Lab...</p>
          <div style={{ height: '80vh', marginTop: 20, border: '1px solid #ccc' }}>
            <iframe
              title="Jupyter Lab"
              src={`/jupyter/lab?session=${sessionToken}`}
              style={{ width: '100%', height: '100%', border: 0 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
