import React, { useState, useEffect } from 'react';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Admin token not found. Please log in as admin.');
      return null;
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    const headers = getAuthHeaders();
    if (!headers) {
      setLoading(false);
      return;
    }

    try {
      // Fetch users
      const usersRes = await fetch('/api/admin/users', { headers: { 'Authorization': headers.Authorization } });
      if (!usersRes.ok) {
        throw new Error(`Failed to fetch users: ${usersRes.statusText}`);
      }
      const usersData = await usersRes.json();
      setUsers(usersData);

      // Fetch sessions
      const sessionsRes = await fetch('/api/admin/sessions', { headers: { 'Authorization': headers.Authorization } });
      if (!sessionsRes.ok) {
        throw new Error(`Failed to fetch sessions: ${sessionsRes.statusText}`);
      }
      const sessionsData = await sessionsRes.json();
      setSessions(sessionsData);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (username) => {
    if (!window.confirm(`Are you sure you want to delete user ${username}?`)) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Admin token not found.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/user/${username}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to delete user: ${res.statusText}`);
      }
      fetchAdminData(); // Refresh data after deletion
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddingUser(true);
    setError(null);

    const headers = getAuthHeaders();
    if (!headers) {
      setAddingUser(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/user', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(newUser)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Failed to add user: ${res.statusText}`);
      }
      setNewUser({ username: '', password: '', role: 'user' }); // Clear form
      fetchAdminData(); // Refresh data
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingUser(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem', fontSize: '1.125rem', color: '#4b5563' }}>Loading Admin Dashboard...</div>;
  if (error) return <div style={{ backgroundColor: '#fee2e2', border: '1px solid #ef4444', color: '#b91c1c', padding: '12px 16px', borderRadius: '4px', position: 'relative', marginBottom: '1rem' }} role="alert">Error: {error}</div>;

  return (
    <div style={{ padding: '1.5rem', backgroundColor: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', borderRadius: '8px' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1f2937' }}>Admin Dashboard</h1>

      {/* Add New User Form */}
      <section style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'semibold', marginBottom: '1rem', color: '#374151' }}>Add New User</h2>
        <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="new-username" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Username</label>
            <input
              type="text"
              id="new-username"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              style={{ marginTop: '0.25rem', display: 'block', width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '0.5rem 0.75rem', outline: 'none' }}
              required
            />
          </div>
          <div>
            <label htmlFor="new-password" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Password</label>
            <input
              type="password"
              id="new-password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              style={{ marginTop: '0.25rem', display: 'block', width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '0.5rem 0.75rem', outline: 'none' }}
              required
            />
          </div>
          <div>
            <label htmlFor="new-role" style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Role</label>
            <select
              id="new-role"
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              style={{ marginTop: '0.25rem', display: 'block', width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '0.5rem 0.75rem', outline: 'none' }}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={addingUser}
            style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', padding: '0.5rem 1rem', border: '1px solid transparent', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontSize: '0.875rem', fontWeight: '500', borderRadius: '0.375rem', color: 'white', backgroundColor: '#10b981', cursor: addingUser ? 'not-allowed' : 'pointer', opacity: addingUser ? 0.5 : 1 }}
          >
            {addingUser ? 'Adding User...' : 'Add User'}
          </button>
        </form>
      </section>

      {/* Users Table */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'semibold', marginBottom: '1rem', color: '#374151' }}>Users</h2>
        <div style={{ overflowX: 'auto', backgroundColor: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', borderRadius: '8px' }}>
          <table style={{ minWidth: '100%', lineHeight: 'normal' }}>
            <thead>
              <tr>
                <th style={{ padding: '0.75rem 1.25rem', borderBottom: '2px solid #e5e7eb', backgroundColor: '#f3f4f6', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'semibold', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</th>
                <th style={{ padding: '0.75rem 1.25rem', borderBottom: '2px solid #e5e7eb', backgroundColor: '#f3f4f6', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'semibold', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                <th style={{ padding: '0.75rem 1.25rem', borderBottom: '2px solid #e5e7eb', backgroundColor: '#f3f4f6', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'semibold', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map(user => (
                  <tr key={user.username} style={{ '&:hover': { backgroundColor: '#f9fafb' } }}>
                    <td style={{ padding: '1.25rem', borderBottom: '1px solid #e5e7eb', backgroundColor: 'white', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '10rem' }}>{user.username}</td>
                    <td style={{ padding: '1.25rem', borderBottom: '1px solid #e5e7eb', backgroundColor: 'white', fontSize: '0.875rem' }}>{user.role}</td>
                    <td style={{ padding: '1.25rem', borderBottom: '1px solid #e5e7eb', backgroundColor: 'white', fontSize: '0.875rem' }}>
                      <button 
                        onClick={() => handleDeleteUser(user.username)} 
                        style={{ color: '#ef4444', '&:hover': { color: '#b91c1c' }, fontWeight: '500', opacity: user.username === "admin" ? 0.5 : 1, cursor: user.username === "admin" ? 'not-allowed' : 'pointer' }}
                        disabled={user.username === "admin"}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" style={{ padding: '1.25rem', borderBottom: '1px solid #e5e7eb', backgroundColor: 'white', fontSize: '0.875rem', textAlign: 'center' }}>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Active Sessions Table */}
      <section>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'semibold', marginBottom: '1rem', color: '#374151' }}>Active Sessions</h2>
        <div style={{ overflowX: 'auto', backgroundColor: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', borderRadius: '8px' }}>
          <table style={{ minWidth: '100%', lineHeight: 'normal' }}>
            <thead>
              <tr>
                <th style={{ padding: '0.75rem 1.25rem', borderBottom: '2px solid #e5e7eb', backgroundColor: '#f3f4f6', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'semibold', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Session ID</th>
                <th style={{ padding: '0.75rem 1.25rem', borderBottom: '2px solid #e5e7eb', backgroundColor: '#f3f4f6', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'semibold', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</th>
                <th style={{ padding: '0.75rem 1.25rem', borderBottom: '2px solid #e5e7eb', backgroundColor: '#f3f4f6', textAlign: 'left', fontSize: '0.75rem', fontWeight: 'semibold', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length > 0 ? (
                sessions.map(([sessionId, sessionData]) => (
                  <tr key={sessionId} style={{ '&:hover': { backgroundColor: '#f9fafb' } }}>
                    <td style={{ padding: '1.25rem', borderBottom: '1px solid #e5e7eb', backgroundColor: 'white', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '10rem' }}>{sessionId}</td>
                    <td style={{ padding: '1.25rem', borderBottom: '1px solid #e5e7eb', backgroundColor: 'white', fontSize: '0.875rem' }}>{sessionData.user}</td>
                    <td style={{ padding: '1.25rem', borderBottom: '1px solid #e5e7eb', backgroundColor: 'white', fontSize: '0.875rem' }}>{new Date(sessionData.created).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" style={{ padding: '1.25rem', borderBottom: '1px solid #e5e7eb', backgroundColor: 'white', fontSize: '0.875rem', textAlign: 'center' }}>No active sessions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;
