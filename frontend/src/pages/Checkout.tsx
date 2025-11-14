import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Grid,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Checkbox,
  Alert
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { AddressDTO, createAddress, getDefaultAddress, setDefaultAddress as apiSetDefaultAddress } from '../services/address';
import { createOrder, CreateOrderItemRequest } from '../services/order';
import { createVNPayPayment } from '../services/payment';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  storeId?: string;
}

const steps = ['Delivery Address', 'Payment Method', 'Review Order'];

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedStoreId = (location.state as any)?.selectedStoreId as string | undefined;
  const [activeStep, setActiveStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('vnpay');
  const [useSavedAddress, setUseSavedAddress] = useState<'default' | 'new'>('new');
  const [defaultAddress, setDefaultAddress] = useState<AddressDTO | null>(null);
  const [useOnce, setUseOnce] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [address, setAddress] = useState({
    fullName: '',
    phone: '',
    street: '',
    city: '',
    district: '',
    notes: ''
  });

  const auth = useSelector((state: RootState) => state.auth);
  const userId = auth.user ? Number(auth.user.id) : null;
  const { items, totalAmount } = useSelector((state: RootState) => state.cart);
  const selectedItems: CartItem[] = (selectedStoreId ? items.filter((it: any) => it.storeId === selectedStoreId) : items) as any;
  const selectedTotal: number = selectedItems.reduce((sum, it) => sum + it.price * it.quantity, 0);

  const isValidPhone = (p: string | undefined) => !!p && /^\d{10,11}$/.test(p);
  const isValidLocalAddress = (a: any) =>
    !!(a && a.receiverName && a.phone && a.line1 && a.city && isValidPhone(a.phone));
  const isValidAddressDTO = (a: AddressDTO | null): a is AddressDTO =>
    !!(a && typeof a.id === 'number' && a.id > 0 && a.receiverName && a.phone && a.line1 && a.city && isValidPhone(a.phone));

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const addr = await getDefaultAddress(userId);
        if (addr) {
          setDefaultAddress(addr);
          setUseSavedAddress('default');
          return;
        }
      } catch {
        // ignore and fallback
      }
      try {
        const raw = localStorage.getItem(`address:${userId}:default`);
        if (raw) {
          const localDef = JSON.parse(raw) as Partial<AddressDTO> & { receiverName?: string; phone?: string; line1?: string; ward?: string; district?: string; city?: string };
          // If local default is invalid, force user to enter new address and prefill fields
          if (!isValidLocalAddress(localDef)) {
            setDefaultAddress(null);
            setUseSavedAddress('new');
            setAddress(prev => ({
              fullName: localDef.receiverName || prev.fullName,
              phone: localDef.phone || prev.phone,
              street: localDef.line1 || prev.street,
              city: localDef.city || prev.city,
              district: localDef.district || prev.district,
              notes: prev.notes,
            }));
          } else if (!localDef.id) {
            // Materialize valid local default on backend to obtain id
            try {
              const created = await createAddress(userId, {
                receiverName: localDef.receiverName!,
                phone: localDef.phone!,
                line1: localDef.line1!,
                ward: localDef.ward || '',
                district: localDef.district || '',
                city: localDef.city!,
                isDefault: true,
              });
              if (created && typeof created.id === 'number') {
                try {
                  await apiSetDefaultAddress(userId, created.id);
                } catch {}
              }
              setDefaultAddress(created);
              setUseSavedAddress('default');
              localStorage.setItem(`address:${userId}:default`, JSON.stringify(created));
            } catch (e) {
              setDefaultAddress(null);
              setUseSavedAddress('new');
            }
          } else {
            const dto = localDef as AddressDTO;
            if (isValidAddressDTO(dto)) {
              setDefaultAddress(dto);
              setUseSavedAddress('default');
            } else {
              setDefaultAddress(null);
              setUseSavedAddress('new');
            }
          }
        } else {
          setDefaultAddress(null);
          setUseSavedAddress('new');
        }
      } catch {
        setDefaultAddress(null);
        setUseSavedAddress('new');
      }
    })();
  }, [userId]);

  const handleNext = async () => {
    setErrorMsg(null);
    if (activeStep === 0) {
      // Validate and prepare address
      try {
        if (useSavedAddress === 'default') {
          if (!isValidAddressDTO(defaultAddress)) {
            setErrorMsg('Địa chỉ mặc định không hợp lệ. Vui lòng nhập địa chỉ mới.');
            return;
          }
        } else {
          // new address flow
          if (!userId) {
            setErrorMsg('Bạn cần đăng nhập để tạo địa chỉ.');
            return;
          }
          if (!address.fullName || !address.phone || !address.street || !address.city) {
            setErrorMsg('Vui lòng điền đầy đủ thông tin địa chỉ.');
            return;
          }
          if (!isValidPhone(address.phone)) {
            setErrorMsg('Số điện thoại phải gồm 10-11 chữ số.');
            return;
          }
          const newAddress = {
            receiverName: address.fullName,
            phone: address.phone,
            line1: address.street,
            ward: '',
            district: address.district,
            city: address.city,
          };
          // Save as default if not 'use once'
          if (!useOnce) {
            try {
              localStorage.setItem(`address:${userId}:default`, JSON.stringify(newAddress));
              setDefaultAddress(newAddress as unknown as AddressDTO);
            } catch {}
          }
        }
        setActiveStep((prev) => prev + 1);
      } catch (err: any) {
        setErrorMsg(err?.response?.data?.message || 'Không thể tạo/lấy địa chỉ.');
      }
      return;
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handlePaymentMethodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentMethod(event.target.value);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddress(prev => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      if (!userId) {
        setErrorMsg('Bạn cần đăng nhập.');
        setSubmitting(false);
        return;
      }
      // Ensure address exists (backend)
      let addressId: number | null = null;
      if (useSavedAddress === 'default') {
        if (isValidAddressDTO(defaultAddress)) {
          addressId = defaultAddress.id;
        } else {
          // Try to create from local default if available
          const raw = localStorage.getItem(`address:${userId}:default`);
          if (!raw) {
            setErrorMsg('Thiếu địa chỉ mặc định. Vui lòng nhập địa chỉ mới.');
            setSubmitting(false);
            return;
          }
          const localDef = JSON.parse(raw) as any;
          if (!isValidLocalAddress(localDef)) {
            setErrorMsg('Địa chỉ mặc định không hợp lệ (SĐT 10-11 chữ số, điền đủ trường). Vui lòng nhập địa chỉ mới.');
            setUseSavedAddress('new');
            setSubmitting(false);
            // Prefill form with whatever is present
            setAddress(prev => ({
              fullName: localDef.receiverName || prev.fullName,
              phone: localDef.phone || prev.phone,
              street: localDef.line1 || prev.street,
              city: localDef.city || prev.city,
              district: localDef.district || prev.district,
              notes: prev.notes,
            }));
            return;
          }
          const created = await createAddress(userId, {
            receiverName: localDef.receiverName || address.fullName,
            phone: localDef.phone || address.phone,
            line1: localDef.line1 || address.street,
            ward: localDef.ward || '',
            district: localDef.district || address.district,
            city: localDef.city || address.city,
            isDefault: true,
          });
          addressId = created.id;
          setDefaultAddress(created);
          if (created && typeof created.id === 'number') {
            try {
              await apiSetDefaultAddress(userId, created.id);
            } catch {}
          }
        }
      } else {
        const requiredFilled = address.fullName && address.phone && address.street && address.city;
        if (!requiredFilled) {
          setErrorMsg('Vui lòng nhập đầy đủ địa chỉ giao hàng.');
          setSubmitting(false);
          return;
        }
        if (!isValidPhone(address.phone)) {
          setErrorMsg('Số điện thoại phải gồm 10-11 chữ số.');
          setSubmitting(false);
          return;
        }
        const created = await createAddress(userId, {
          receiverName: address.fullName,
          phone: address.phone,
          line1: address.street,
          ward: '',
          district: address.district,
          city: address.city,
          isDefault: !useOnce,
        });
        addressId = created.id;
        if (!useOnce) {
          try {
            await apiSetDefaultAddress(userId, created.id);
          } catch {}
          setDefaultAddress(created);
          localStorage.setItem(`address:${userId}:default`, JSON.stringify(created));
        }
      }

      if (selectedItems.length === 0) {
        setErrorMsg('Không có món hàng thuộc cửa hàng đã chọn. Vui lòng quay lại giỏ hàng.');
        setSubmitting(false);
        return;
      }

      const orderItems: CreateOrderItemRequest[] = selectedItems.map((it) => ({
        menuItemId: Number(it.id),
        quantity: it.quantity,
      }));

      const order = await createOrder(userId, {
        addressId: addressId!,
        paymentMethod: paymentMethod.toUpperCase(),
        note: address.notes || undefined,
        items: orderItems,
      });

      if (paymentMethod === 'vnpay') {
        // Request VNPay payment URL and redirect
        const vn = await createVNPayPayment(Number(order.id), {
          returnUrl: `${window.location.origin}/payment/result`,
          ipAddress: '127.0.0.1',
          locale: 'vn',
        });
        localStorage.setItem('pendingOrder', JSON.stringify(order));
        window.location.href = vn.paymentUrl;
      } else {
        // COD: treat as success and go to result
        const addressForOrder = (useSavedAddress === 'default' && defaultAddress)
          ? { line1: defaultAddress.line1, ward: defaultAddress.ward || '', district: defaultAddress.district || '', city: defaultAddress.city }
          : { line1: address.street, ward: '', district: address.district, city: address.city };
        const orderWithDetails = {
          ...order,
          orderItems: selectedItems.map((item) => ({
            id: Number(item.id),
            quantity: item.quantity,
            unitPrice: item.price,
            menuItem: {
              id: Number(item.id),
              name: item.name,
              price: item.price,
              imageUrl: item.image
            }
          })),
          address: addressForOrder
        };
        localStorage.setItem('currentOrder', JSON.stringify(orderWithDetails));
        navigate(`/payment/result?status=success&orderId=${order.id}&method=cod`);
      }
    } catch (error: any) {
      console.error('Error placing order:', error);
      setErrorMsg(error?.response?.data?.message || 'Đặt hàng thất bại');
      navigate('/payment/result?status=failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Delivery Address
            </Typography>
            {errorMsg && (
              <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>
            )}
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <RadioGroup
                row
                value={useSavedAddress}
                onChange={(e) => setUseSavedAddress(e.target.value as 'default' | 'new')}
              >
                <FormControlLabel
                  value="default"
                  control={<Radio />}
                  label="Dùng địa chỉ mặc định"
                  disabled={!defaultAddress}
                />
                <FormControlLabel
                  value="new"
                  control={<Radio />}
                  label="Nhập địa chỉ mới"
                />
              </RadioGroup>
            </FormControl>

            {useSavedAddress === 'default' && defaultAddress && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Địa chỉ mặc định</Typography>
                <Typography gutterBottom>{defaultAddress.receiverName} - {defaultAddress.phone}</Typography>
                <Typography gutterBottom>{defaultAddress.line1}</Typography>
                <Typography gutterBottom>{[defaultAddress.ward, defaultAddress.district, defaultAddress.city].filter(Boolean).join(', ')}</Typography>
              </Paper>
            )}

            {useSavedAddress === 'new' && (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    id="fullName"
                    name="fullName"
                    label="Full Name"
                    fullWidth
                    variant="outlined"
                    value={address.fullName}
                    onChange={handleAddressChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    id="phone"
                    name="phone"
                    label="Phone Number"
                    fullWidth
                    variant="outlined"
                    value={address.phone}
                    onChange={handleAddressChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    id="street"
                    name="street"
                    label="Street Address"
                    fullWidth
                    variant="outlined"
                    value={address.street}
                    onChange={handleAddressChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    id="city"
                    name="city"
                    label="City"
                    fullWidth
                    variant="outlined"
                    value={address.city}
                    onChange={handleAddressChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    id="district"
                    name="district"
                    label="District"
                    fullWidth
                    variant="outlined"
                    value={address.district}
                    onChange={handleAddressChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    id="notes"
                    name="notes"
                    label="Delivery Notes"
                    fullWidth
                    multiline
                    rows={2}
                    variant="outlined"
                    placeholder="Any special instructions for delivery"
                    value={address.notes}
                    onChange={handleAddressChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={<Checkbox checked={useOnce} onChange={(e) => setUseOnce(e.target.checked)} />}
                    label="Chỉ dùng lần này (không đặt làm mặc định)"
                  />
                </Grid>
              </Grid>
            )}
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Payment Method
            </Typography>
            <FormControl component="fieldset">
              <RadioGroup
                aria-label="payment-method"
                name="payment-method"
                value={paymentMethod}
                onChange={handlePaymentMethodChange}
              >
                <FormControlLabel value="vnpay" control={<Radio />} label="VNPay" />
              </RadioGroup>
            </FormControl>
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Order Summary (theo cửa hàng đã chọn)
            </Typography>
            <List sx={{ mb: 2 }}>
              {selectedItems.map((item: CartItem) => (
                <ListItem key={item.id} sx={{ py: 1, px: 0 }}>
                  <ListItemAvatar>
                    <Avatar src={item.image} alt={item.name} variant="rounded" />
                  </ListItemAvatar>
                  <ListItemText
                    primary={item.name}
                    secondary={`Quantity: ${item.quantity}`}
                  />
                  <Typography variant="body2">
                    {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                  </Typography>
                </ListItem>
              ))}
              <Divider />
              <ListItem sx={{ py: 1, px: 0 }}>
                <ListItemText primary="Total" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {selectedTotal.toLocaleString('vi-VN')}đ
                </Typography>
              </ListItem>
            </List>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Delivery Address
                </Typography>
                {useSavedAddress === 'default' && defaultAddress ? (
                  <>
                    <Typography gutterBottom>{defaultAddress.receiverName}</Typography>
                    <Typography gutterBottom>{defaultAddress.phone}</Typography>
                    <Typography gutterBottom>{defaultAddress.line1}</Typography>
                    <Typography gutterBottom>{[defaultAddress.ward, defaultAddress.district, defaultAddress.city].filter(Boolean).join(', ')}</Typography>
                  </>
                ) : (
                  <>
                    <Typography gutterBottom>{address.fullName}</Typography>
                    <Typography gutterBottom>{address.phone}</Typography>
                    <Typography gutterBottom>{address.street}</Typography>
                    <Typography gutterBottom>{address.city}, {address.district}</Typography>
                    {address.notes && (
                      <Typography gutterBottom>Notes: {address.notes}</Typography>
                    )}
                  </>
                )}
              </Grid>
              <Grid item container direction="column" xs={12} sm={6}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Payment Method
                </Typography>
                <Typography gutterBottom>
                  {paymentMethod === 'vnpay' ? 'VNPay' : 'Cash on Delivery'}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Checkout
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        {getStepContent(activeStep)}
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        {activeStep !== 0 && (
          <Button onClick={handleBack} sx={{ mr: 1 }}>
            Back
          </Button>
        )}
        
        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            color="primary"
            onClick={handlePlaceOrder}
            disabled={submitting}
          >
            {submitting ? 'Processing...' : 'Place Order'}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={handleNext}
          >
            Next
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default Checkout;