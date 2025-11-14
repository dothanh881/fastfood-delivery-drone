import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useMerchantSession } from '../../store/merchantSession';

const AuthDebug: React.FC = () => {
  const auth = useSelector((state: RootState) => state.auth);
  const { currentStore } = useMerchantSession();

  return (
    <Paper sx={{ p: 2, m: 2 }}>
      <Typography variant="h6" gutterBottom>
        Debug Information
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">Authentication Status:</Typography>
        <Typography variant="body2">
          Authenticated: {auth.isAuthenticated ? 'Yes' : 'No'}
        </Typography>
        <Typography variant="body2">
          User ID: {auth.user?.id || 'None'}
        </Typography>
        <Typography variant="body2">
          Email: {auth.user?.email || 'None'}
        </Typography>
        <Typography variant="body2">
          Full Name: {auth.user?.fullName || 'None'}
        </Typography>
        <Typography variant="body2">
          Roles: {auth.user?.roles ? JSON.stringify(auth.user.roles) : 'None'}
        </Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">Store Session:</Typography>
        <Typography variant="body2">
          Current Store: {currentStore ? JSON.stringify(currentStore) : 'None'}
        </Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">Local Storage:</Typography>
        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
          Token: {localStorage.getItem('token') ? 'Present' : 'None'}
        </Typography>
        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
          User: {localStorage.getItem('user') || 'None'}
        </Typography>
        <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
          Merchant Session: {localStorage.getItem('merchantSession') || 'None'}
        </Typography>
      </Box>
    </Paper>
  );
};

export default AuthDebug;