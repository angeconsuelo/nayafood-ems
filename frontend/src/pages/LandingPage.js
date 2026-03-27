import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, LinearProgress, Typography } from '@mui/material';

const LANDING_DURATION_MS = 60000;
const FACTORY_IMAGE =
  'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=1600&q=80';

export default function LandingPage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const startedAt = Date.now();

    const intervalId = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min((elapsed / LANDING_DURATION_MS) * 100, 100);
      setProgress(nextProgress);

      if (elapsed >= LANDING_DURATION_MS) {
        window.clearInterval(intervalId);
        navigate(token ? '/dashboard' : '/login', { replace: true });
      }
    }, 200);

    return () => window.clearInterval(intervalId);
  }, [navigate]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundImage: `linear-gradient(rgba(20, 16, 12, 0.48), rgba(20, 16, 12, 0.48)), url(${FACTORY_IMAGE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 520,
          textAlign: 'center'
        }}
      >
        <Typography
          variant="h3"
          sx={{
            color: '#fff',
            fontWeight: 800,
            mb: 1.5,
            textShadow: '0 6px 22px rgba(0,0,0,0.35)'
          }}
        >
          System Loading
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: 'rgba(255,255,255,0.92)',
            mb: 3.5,
            textShadow: '0 4px 18px rgba(0,0,0,0.30)'
          }}
        >
          Preparing your workspace...
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 12,
            borderRadius: 999,
            bgcolor: 'rgba(255,255,255,0.28)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 999,
              bgcolor: '#fff'
            }
          }}
        />
      </Box>
    </Box>
  );
}
