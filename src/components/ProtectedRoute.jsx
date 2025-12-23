import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const ProtectedRoute = ({ children, allowedRoles = null }) => {
  const { currentUser, loading } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!currentUser) {
        setRoleLoading(false);
        return;
      }

      try {
        // Check operators collection for role
        const operatorDoc = await getDoc(doc(db, 'operators', currentUser.uid));
        if (operatorDoc.exists()) {
          const data = operatorDoc.data();
          setUserRole(data.role || 'admin');
          setUserData(data);
        } else {
          // Default to admin for users not in operators collection (backward compatibility)
          setUserRole('admin');
          setUserData(null);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole('admin'); // Default to admin on error
      } finally {
        setRoleLoading(false);
      }
    };

    fetchUserRole();
  }, [currentUser]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/admin/login" />;
  }

  // If allowedRoles is specified, check if user has permission
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Redirect to appropriate page based on role
    if (userRole === 'whatsapp_operator') {
      return <Navigate to="/admin/whatsapp" />;
    }
    if (userRole === 'city_operator' && userData?.assignedCityId) {
      return <Navigate to={`/admin/city-dashboard/${userData.assignedCityId}`} />;
    }
    return <Navigate to="/admin/dashboard" />;
  }

  return children;
};

export default ProtectedRoute;
