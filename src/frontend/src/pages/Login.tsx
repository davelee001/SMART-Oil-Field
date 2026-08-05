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
} from '@mui/material';
import { toast } from 'react-toastify';

import { useAuth } from '../contexts/AuthContext';

// Mock authentication UI — replace with real API-backed auth (JWT/session).
const Login: React.FC = () => {
    const navigate = useNavigate();
    const { login, register } = useAuth();
    const [tab, setTab] = useState<'login' | 'register'>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim() || !password.trim() || (tab === 'register' && !name.trim())) {
            toast.error('Please fill in all required fields');
            return;
        }

        const displayName = tab === 'register' ? name.trim() : email.split('@')[0];

        storeUser({
            name: displayName,
            email: email.trim(),
            walletAddress: '',
        });

        toast.success(
            tab === 'register'
                ? `Welcome to SMART Oil Field, ${displayName}!`
                : `Welcome back, ${displayName}!`
        );
        navigate('/dashboard', { replace: true });
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
                            type="password"
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <Button type="submit" variant="contained" size="large" sx={{ mt: 1 }}>
                            {tab === 'register' ? 'Create Account' : 'Sign In'}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default Login;
