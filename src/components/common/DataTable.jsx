// src/components/common/DataTable.jsx
import React, { useState } from 'react';
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Paper,
  TextField,
  Box,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';

/**
 * Reusable DataTable component
 * @param {Array<{id: string, label: string, render?: function}>} columns Column definitions
 * @param {Array<object>} data Data rows
 * @param {boolean} loading Loading indicator
 * @param {string} searchPlaceholder Search field placeholder
 */
const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  searchPlaceholder = 'Search...',
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your search query.',
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter rows based on search
  const filteredData = data.filter((row) =>
    columns.some((col) => {
      const val = row[col.id];
      if (val === null || val === undefined) return false;
      return String(val).toLowerCase().includes(searchQuery.toLowerCase());
    })
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedData = filteredData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Paper elevation={0} sx={{ width: '100%', overflow: 'hidden' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-start' }}>
        <TextField
          size="small"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: '100%', sm: 300 } }}
        />
      </Box>

      {loading ? (
        <LoadingState minHeight={200} />
      ) : filteredData.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: 'grey.50' }}>
                <TableRow>
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      align={col.align || 'left'}
                      sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}
                    >
                      {col.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.map((row, rowIdx) => (
                  <TableRow key={row.id || rowIdx} hover>
                    {columns.map((col) => (
                      <TableCell key={col.id} align={col.align || 'left'}>
                        {col.render ? col.render(row[col.id], row) : row[col.id]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}
    </Paper>
  );
};

export default DataTable;
