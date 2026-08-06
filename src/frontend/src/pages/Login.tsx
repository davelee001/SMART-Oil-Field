import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Box,
    Tabs,
    Tab,
    IconButton,
    InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { toast } from 'react-toastify';

import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login, register } = useAuth();
    const [tab, setTab] = useState<'login' | 'register'>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim() || !password.trim() || (tab === 'register' && !name.trim())) {
            toast.error('Please fill in all required fields');
            return;
        }

        setSubmitting(true);
        try {
            const user = tab === 'register'
                ? await register(name.trim(), email.trim(), password)
                : await login(email.trim(), password);
            toast.success(tab === 'register' ? `Welcome to SMART Oil Field, ${user.name}!` : `Welcome back, ${user.name}!`);
            navigate('/dashboard', { replace: true });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Authentication failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ mt: 8 }}>
            <Card>
                <CardContent sx={{ p: 4 }}>
                    <Typography variant="h4" color="primary" gutterBottom textAlign="center">
                        SMART Oil Field
                    </Typography>
                    <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
                        Sign in to manage your subscriptions and oil field data
                    </Typography>

                    <Tabs
                        value={tab}
                        onChange={(_e, value) => setTab(value)}
                        variant="fullWidth"
                        sx={{ mb: 3 }}
                    >
                        <Tab label="Login" value="login" />
                        <Tab label="Register" value="register" />
                    </Tabs>

                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {tab === 'register' && (
                            <TextField
                                label="Full Name"
                                fullWidth
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        )}
                        <TextField
                            label="Email"
                            type="email"
                            fullWidth
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <TextField
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            inputProps={{ minLength: 12 }}
                            autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            title={showPassword ? 'Hide password' : 'Show password'}
                                            onClick={() => setShowPassword((visible) => !visible)}
                                            onMouseDown={(event) => event.preventDefault()}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <Button type="submit" variant="contained" size="large" disabled={submitting} sx={{ mt: 1 }}>
                            {submitting ? 'Please wait…' : tab === 'register' ? 'Create Account' : 'Sign In'}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default Login;
