import { useLocation, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../store";

/**
 * Protect routes that require the user to have a 'CUSTOMER' role.
 * Redirects to login if unauthenticated, or home if lacking the role.
 */
const RequireCustomer = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  const hasCustomerRole = user?.roles?.includes('CUSTOMER') || user?.roles?.includes('ROLE_CUSTOMER');

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasCustomerRole) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default RequireCustomer;