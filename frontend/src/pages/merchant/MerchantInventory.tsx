import React, { useEffect, useState } from 'react';
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip } from '@mui/material';

/**
 * M08 - Inventory (Mock)
 * - TODO: Gọi API tồn kho, cập nhật số lượng, cảnh báo hết hàng (sau)
 * - Hiện hiển thị tồn kho giả và cảnh báo.
 */
interface StockItem { id: number; name: string; qty: number; threshold: number; }

const MOCK_STOCK: StockItem[] = [
  { id: 1, name: 'Bánh burger', qty: 120, threshold: 50 },
  { id: 2, name: 'Gà rán', qty: 40, threshold: 60 },
  { id: 3, name: 'Khoai tây', qty: 20, threshold: 30 },
];

const MerchantInventory: React.FC = () => {
  const [rows, setRows] = useState<StockItem[]>([]);

  useEffect(() => {
    // TODO: Gọi API lấy tồn kho (sau)
    setRows(MOCK_STOCK);
  }, []);

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>Tồn kho & Cảnh báo</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nguyên liệu</TableCell>
            <TableCell>Số lượng</TableCell>
            <TableCell>Ngưỡng cảnh báo</TableCell>
            <TableCell>Trạng thái</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => {
            const low = r.qty < r.threshold;
            return (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.qty}</TableCell>
                <TableCell>{r.threshold}</TableCell>
                <TableCell>
                  <Chip label={low ? 'Hết hàng sắp tới' : 'Đủ hàng'} color={low ? 'error' : 'success'} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
};

export default MerchantInventory;