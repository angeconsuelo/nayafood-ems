import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Business,
  Email,
  Lock,
} from '@mui/icons-material';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_URL } from '../config/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      const { token, ...user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      toast.success(`Good to see you, ${user.firstName || 'there'}!`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
        background: `
          radial-gradient(circle at top left, rgba(166, 110, 196, 0.26), transparent 34%),
          radial-gradient(circle at bottom right, rgba(240, 229, 210, 0.95), transparent 32%),
          linear-gradient(135deg, #f7f1e8 0%, #efe3d5 46%, #d9c1eb 100%)
        `,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        <Paper
          elevation={6}
          sx={{
            p: { xs: 3, sm: 4 },
            width: '100%',
            borderRadius: 5,
            border: '1px solid rgba(123, 31, 162, 0.12)',
            boxShadow: '0 20px 48px rgba(88, 52, 121, 0.16)',
            background: 'rgba(255, 250, 244, 0.92)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Avatar
              sx={{
                mb: 2,
                width: { xs: 64, sm: 76 },
                height: { xs: 64, sm: 76 },
                bgcolor: '#8F63B8',
                boxShadow: '0 12px 24px rgba(143, 99, 184, 0.28)',
              }}
            >
              <Business sx={{ fontSize: { xs: 32, sm: 40 } }} />
            </Avatar>

            <Typography component="h1" variant="h5" sx={{ fontWeight: 700, color: '#5F3B82', textAlign: 'center' }}>
              Enterprise Management Login
            </Typography>
            <Typography
              variant="body2"
              sx={{ mb: 3, textAlign: 'center', color: '#6E5A52', maxWidth: 320 }}
            >
              Sign in to manage attendance, payroll, schedules, and workforce operations in one place.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Email Address"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: '#7B1FA2' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: '#fffaf4',
                  },
                }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: '#7B1FA2' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    bgcolor: '#fffaf4',
                  },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  bgcolor: '#8F63B8',
                  '&:hover': { bgcolor: '#744a9d' },
                  borderRadius: 2,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>

              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Need help getting in? Your administrator can activate your access.
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Use your work email and password to continue.
                </Typography>
              </Box>

              <Typography
                variant="caption"
                sx={{ mt: 3, color: '#8A786F' }}
                align="center"
                display="block"
              >
                Flexible employee management system
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
