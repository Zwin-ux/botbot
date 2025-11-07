import React from 'react';
import { Box, Chip, CircularProgress } from '@mui/material';
import { Wifi, WifiOff } from '@mui/icons-material';

interface ConnectionStatusProps {
  isConnected: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected }) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {isConnected ? (
        <Chip
          icon={<Wifi />}
          label="Connected"
          color="success"
          variant="outlined"
          size="small"
        />
      ) : (
        <Chip
          icon={<WifiOff />}
          label="Disconnected"
          color="error"
          variant="outlined"
          size="small"
        />
      )}
    </Box>
  );
};

export default ConnectionStatus;