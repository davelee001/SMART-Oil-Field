import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Button, Card, CardContent, Chip, Container, TextField, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS } from '../utils/auth';

const Profile: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout, updateProfile } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [walletAddress, setWalletAddress] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name);
            setEmail(user.email);
            setWalletAddress(user.walletAddress || '');
        }
    }, [user]);

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();
        setSaving(true);
        try {
            await updateProfile({ name: name.trim(), email: email.trim(), walletAddress: walletAddress.trim() || null });
            toast.success('Profile updated');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not update profile');
        } finally { setSaving(false); }
    };

    const handleLogout = async () => {
        try { await logout(); } finally { navigate('/login', { replace: true }); }
    };

    if (!user) return null;

    return (
        <Container maxWidth="sm" sx={{ mt: 4 }}>
            <Card>
                <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                        <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>
                            {name.charAt(0).toUpperCase() || '?'}
                        </Avatar>
                        <Box>
                            <Typography variant="h5">{name || 'Unnamed User'}</Typography>
                            <Typography variant="body2" color="text.secondary">{email}</Typography>
                        </Box>
                    </Box>

                    <Box component="form" onSubmit={handleSave} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Full Name"
                            fullWidth
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <TextField
                            label="Email"
                            type="email"
                            fullWidth
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <TextField
                            label="Wallet Address"
                            fullWidth
                            placeholder="0x..."
                            value={walletAddress}
                            onChange={(e) => setWalletAddress(e.target.value)}
                            helperText="Aptos wallet address used for subscription payments"
                        />
                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                            <Button type="submit" variant="contained">
                                Save Changes
                            </Button>
                            <Button variant="outlined" color="error" onClick={handleLogout}>
                                Log Out
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default Profile;
