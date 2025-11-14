import React from 'react';
import { Stack, Button, Typography } from '@mui/material';

export interface PaginationBarProps {
  page: number; // zero-based
  totalPages: number;
  onChange: (page: number) => void;
  maxButtons?: number; // total numeric buttons to show around current
}

// Build pages with ellipses similar to: << < 1 … 4 5 [6] 7 8 … 20 > >>
function buildPageList(page: number, totalPages: number, maxButtons: number): (number | 'ellipsis')[] {
  if (totalPages <= 0) return [];
  const current = Math.max(0, Math.min(page, totalPages - 1));
  const showCount = Math.max(3, maxButtons);

  const pages: number[] = [];
  // Always include first and last later via rendering of arrows; we still compute window
  const half = Math.floor(showCount / 2);
  let start = current - half;
  let end = current + half;
  if (showCount % 2 === 0) end -= 1; // keep total count consistent

  if (start < 0) {
    end += -start;
    start = 0;
  }
  if (end > totalPages - 1) {
    const diff = end - (totalPages - 1);
    start = Math.max(0, start - diff);
    end = totalPages - 1;
  }

  for (let i = start; i <= end; i++) pages.push(i);

  const result: (number | 'ellipsis')[] = [];
  // Leading section
  if (pages[0] > 0) {
    // Always show first page
    result.push(0);
    if (pages[0] > 1) result.push('ellipsis');
  }
  // Middle window
  result.push(...pages);
  // Trailing section
  if (pages[pages.length - 1] < totalPages - 1) {
    if (pages[pages.length - 1] < totalPages - 2) result.push('ellipsis');
    result.push(totalPages - 1);
  }

  return result;
}

const PaginationBar: React.FC<PaginationBarProps> = ({ page, totalPages, onChange, maxButtons = 5 }) => {
  const disabled = totalPages <= 1;
  const items = buildPageList(page, totalPages, maxButtons);

  const goFirst = () => onChange(0);
  const goPrev = () => onChange(Math.max(0, page - 1));
  const goNext = () => onChange(Math.min(totalPages - 1, page + 1));
  const goLast = () => onChange(Math.max(0, totalPages - 1));

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Button size="small" variant="outlined" disabled={disabled || page === 0} onClick={goFirst}>
        {'<<'}
      </Button>
      <Button size="small" variant="outlined" disabled={disabled || page === 0} onClick={goPrev}>
        {'<'}
      </Button>
      {items.map((it, idx) => (
        it === 'ellipsis' ? (
          <Typography key={`el-${idx}`} variant="body2" sx={{ px: 0.5 }}>…</Typography>
        ) : (
          <Button
            key={it}
            size="small"
            variant={it === page ? 'contained' : 'outlined'}
            color={it === page ? 'primary' : 'inherit'}
            onClick={() => onChange(it)}
          >
            {it + 1}
          </Button>
        )
      ))}
      <Button size="small" variant="outlined" disabled={disabled || page >= totalPages - 1} onClick={goNext}>
        {'>'}
      </Button>
      <Button size="small" variant="outlined" disabled={disabled || page >= totalPages - 1} onClick={goLast}>
        {'>>'}
      </Button>
    </Stack>
  );
};

export default PaginationBar;