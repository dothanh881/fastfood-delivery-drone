import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Link,
  CircularProgress,
  Alert,
  Container
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { loginStart, loginSuccess, loginFailure } from '../store/slices/authSlice';
import { toast } from 'react-toastify';
import api from '../services/api'; // Assuming you have an api service configured

const Login: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, isLoading } = useSelector(
    (state: RootState) => state.auth
  );

  // Determine where to redirect after login. Default to home page.
  const from = location.state?.from?.pathname || "/";

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      const hasAdminRole =
        user.roles.includes("ADMIN") || user.roles.includes("ROLE_ADMIN");

      const hasManagerRole =
        user.roles.includes("MANAGER") ||
        user.roles.includes("ROLE_MANAGER") ||
        user.roles.includes("MERCHANT") ||
        user.roles.includes("ROLE_MERCHANT");

      const hasStaffRole =
        user.roles.includes("STAFF") || user.roles.includes("ROLE_STAFF");

      if (hasAdminRole) {
        navigate("/admin/dashboard", { replace: true });
      } else if (hasManagerRole) {
        navigate("/merchant/dashboard", { replace: true });
      } else if (hasStaffRole) {
        navigate("/staff/orders", { replace: true });
      } else {
        // For other roles (e.g., CUSTOMER), go to the 'from' location or home
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, from]);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
      password: Yup.string().required('Password is required'),
    }),
    onSubmit: async (values) => {
      dispatch(loginStart());
      try {
        const response = await api.post('/auth/login', values);
        const { token, refreshToken, ...user } = response.data;
        dispatch(loginSuccess({ user, token, refreshToken }));
        toast.success("Login successful!");
        // The useEffect above will handle the redirection
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || "Login failed. Please check your credentials.";
        dispatch(loginFailure());
        toast.error(errorMessage);
      }
    },
  });

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 64px)', // Adjust for header height if necessary
          py: 4
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            maxWidth: 400,
          }}
        >
          <Typography variant="h5" component="h1" gutterBottom align="center">
            Login
          </Typography>

          <form onSubmit={formik.handleSubmit}>
            <TextField
              fullWidth
              id="email"
              name="email"
              label="Email"
              variant="outlined"
              margin="normal"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
            />

            <TextField
              fullWidth
              id="password"
              name="password"
              label="Password"
              type="password"
              variant="outlined"
              margin="normal"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={isLoading}
              sx={{ mt: 3, mb: 2 }}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Login'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2">
                Don't have an account?{' '}
                <Link component={RouterLink} to="/register">
                  Register here
                </Link>
              </Typography>
            </Box>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;