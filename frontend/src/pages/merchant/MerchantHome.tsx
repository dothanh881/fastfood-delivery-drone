import React from 'react';
import { Box, Typography, Grid, Card, CardActionArea, CardContent } from '@mui/material';
import { useNavigate } from 'react-router-dom';

/**
 * Landing page cho Merchant/Kitchen Portal (Mock)
 * - Không gọi API. Chỉ điều hướng tới các màn hình chức năng.
 */
const tiles = [
  { title: 'Login (M01)', path: '/merchant/login' },
  { title: 'Dashboard (M02)', path: '/merchant/dashboard' },
  { title: 'Orders (M03)', path: '/merchant/orders' },
  { title: 'Order Detail (M04)', path: '/merchant/orders/123' },
  { title: 'Menu (M05)', path: '/merchant/menu' },
  { title: 'Menu Form (M06)', path: '/merchant/menu/new' },
  { title: 'Categories (M07)', path: '/merchant/categories' },
  { title: 'Inventory (M08)', path: '/merchant/inventory' },
  { title: 'Staff (M09)', path: '/merchant/staff' },
  { title: 'Reports (M10)', path: '/merchant/reports' },
];

const MerchantHome: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Merchant / Kitchen Portal (Mock)
      </Typography>
      <Typography color="text.secondary" gutterBottom>
        Chọn chức năng để xem giao diện mock.
      </Typography>
      <Grid container spacing={2}>
        {tiles.map((t) => (
          <Grid key={t.path} item xs={12} sm={6} md={4}>
            <Card>
              <CardActionArea onClick={() => navigate(t.path)}>
                <CardContent>
                  <Typography variant="h6">{t.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{t.path}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default MerchantHome;