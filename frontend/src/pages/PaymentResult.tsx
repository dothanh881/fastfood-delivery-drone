import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, CircularProgress } from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { clearCart } from '../store/slices/cartSlice';
import { simulateVNPayReturn } from '../services/payment';

const PaymentResult: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [orderId, setOrderId] = useState<string>('');
  
  const searchParams = new URLSearchParams(location.search);
  const status = searchParams.get('status') || 'processing';
  const orderIdParam = searchParams.get('orderId');
  const paymentMethod = searchParams.get('method');
  
  // VNPay return parameters
  const vnpResponseCode = searchParams.get('vnp_ResponseCode');
  const vnpTxnRef = searchParams.get('vnp_TxnRef');
  const vnpOrderInfo = searchParams.get('vnp_OrderInfo');

  const isVNPayReturn = !!vnpResponseCode;

  useEffect(() => {
    // Handle VNPay return
    if (isVNPayReturn) {
      // Notify backend to process VNPay return (verify signature & update order/payment)
      try {
        const query: Record<string, string> = {};
        searchParams.forEach((value, key) => { query[key] = value; });
        simulateVNPayReturn(query);
      } catch (e) {
        console.error('Failed to verify VNPay return on backend', e);
      }

      if (vnpResponseCode === '00') {
        // Payment successful
        const newOrderId = vnpOrderInfo || vnpTxnRef || `ORD_${Date.now()}`;
        setOrderId(newOrderId);
        
        // Get pending order data and update it
        const pendingOrderData = localStorage.getItem('pendingOrder');
        let orderData;
        
        if (pendingOrderData) {
          orderData = JSON.parse(pendingOrderData);
          orderData.status = 'CONFIRMED';
          orderData.paymentStatus = 'PAID';
          orderData.id = newOrderId;
          
          // Ensure orderItems and address are preserved from pendingOrder
          if (!orderData.orderItems && orderData.items) {
            orderData.orderItems = orderData.items;
          }
          
          // Ensure we have the enhanced data structure for order tracking
          if (!orderData.orderItems || orderData.orderItems.length === 0) {
            console.warn('No orderItems found in pendingOrder, order tracking may not work properly');
          }
          if (!orderData.address) {
            console.warn('No address found in pendingOrder, order tracking may not work properly');
          }
        } else {
          orderData = {
            id: newOrderId,
            status: 'CONFIRMED',
            paymentMethod: 'VNPAY',
            paymentStatus: 'PAID',
            orderDate: new Date().toISOString(),
            totalAmount: parseFloat(searchParams.get('vnp_Amount') || '0') / 2300000, // Convert VND cents back to USD (approx)
            orderItems: [],
            address: null
          };
        }
        
        localStorage.setItem('currentOrder', JSON.stringify(orderData));
        localStorage.removeItem('pendingOrder'); // Clean up pending order
        
        // Clear cart after successful payment
        dispatch(clearCart());
      } else {
        // Payment failed - keep pending order for retry
        const newOrderId = vnpOrderInfo || vnpTxnRef || `ORD_${Date.now()}`;
        setOrderId(newOrderId);
      }
    } else if (orderIdParam) {
      setOrderId(orderIdParam);
      if (status === 'success') {
        dispatch(clearCart());
      }
    }
  }, [isVNPayReturn, vnpResponseCode, vnpTxnRef, vnpOrderInfo, orderIdParam, status, dispatch, searchParams]);

  const getPaymentStatus = () => {
    if (isVNPayReturn) {
      return vnpResponseCode === '00' ? 'success' : 'failed';
    }
    return status;
  };

  const renderContent = () => {
    const paymentStatus = getPaymentStatus();
    const methodLabel = 'Thanh toán qua VNPay';
    
    switch (paymentStatus) {
      case 'success':
        return (
          <>
            <CheckCircle color="success" sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Thanh toán thành công!
            </Typography>
            <Typography variant="body1" paragraph>
              Đơn hàng của bạn đã được đặt thành công. 
              {orderId && ` Mã đơn hàng: ${orderId}`}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {methodLabel}
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate(`/order/tracking/${orderId}`)}
                sx={{ mr: 2 }}
                disabled={!orderId}
              >
                Theo dõi đơn hàng
              </Button>

              <Button
                variant="outlined"
                onClick={() => navigate('/')}
              >
                Tiếp tục mua sắm
              </Button>
            </Box>
          </>
        );
      case 'failed':
        return (
          <>
            <Cancel color="error" sx={{ fontSize: 80, mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Thanh toán thất bại
            </Typography>
            <Typography variant="body1" paragraph>
              Không thể xử lý thanh toán của bạn. Vui lòng thử lại hoặc chọn phương thức thanh toán khác.
            </Typography>
            {isVNPayReturn && (
              <Typography variant="body2" color="text.secondary" paragraph>
                Mã lỗi VNPay: {vnpResponseCode}
              </Typography>
            )}
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/checkout')}
                sx={{ mr: 2 }}
              >
                Thử lại
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/cart')}
              >
                Quay lại giỏ hàng
              </Button>
            </Box>
          </>
        );
      default:
        return (
          <>
            <CircularProgress size={80} sx={{ mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Đang xử lý thanh toán
            </Typography>
            <Typography variant="body1" paragraph>
              Vui lòng đợi trong khi chúng tôi xử lý thanh toán của bạn. Không đóng trang này.
            </Typography>
          </>
        );
    }
  };

  return (
    <Box sx={{ py: 8, textAlign: 'center' }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 600,
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {renderContent()}
      </Paper>
    </Box>
  );
};

export default PaymentResult;