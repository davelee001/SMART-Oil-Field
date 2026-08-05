import React from 'react';
import { Link } from 'react-router-dom';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Switch,
    FormControlLabel,
    Box,
    Avatar,
    Tooltip,
    Button,
    Stack,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
    Login as LoginIcon,
    PersonAddOutlined as RegisterIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

import { useAuth } from '../../contexts/AuthContext';

interface NavbarProps {
    onThemeToggle: () => void;
    darkMode: boolean;
    onSidebarToggle: () => void;
    isPublicPage?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({
    onThemeToggle,
    darkMode,
    onSidebarToggle,
    isPublicPage = false,
}) => {
    const { user } = useAuth();

    return (
        <AppBar
            position="fixed"
            elevation={isPublicPage ? 1 : 4}
            sx={{
                zIndex: (theme) => theme.zIndex.drawer + 1,
                background: (theme) =>
                    darkMode
                        ? 'linear-gradient(110deg, #0B1720 0%, #142B39 100%)'
                        : 'linear-gradient(110deg, #0F2942 0%, #173F5F 68%, #1A5563 100%)',
            }}
        >
            <Toolbar sx={{ minHeight: '64px !important', px: { xs: 2, sm: 3 } }}>
                {!isPublicPage && (
                    <IconButton
                        color="inherit"
                        onClick={onSidebarToggle}
                        edge="start"
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                )}

                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Typography
                        variant="h6"
                        component={Link}
                        to="/"
                        sx={{
                            fontWeight: 750,
                            letterSpacing: '-0.015em',
                            color: 'inherit',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        SMART Oil Field
                    </Typography>
                </motion.div>

                {isPublicPage && (
                    <Stack direction="row" spacing={3} sx={{ ml: 4, display: { xs: 'none', md: 'flex' } }}>
                        <Button
                            component={Link}
                            to="/"
                            color="inherit"
                            sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                color: 'rgba(255, 255, 255, 0.85)',
                                '&:hover': { color: '#ffffff' },
                            }}
                        >
                            Overview
                        </Button>
                        <Button
                            component={Link}
                            to="/dashboard"
                            color="inherit"
                            sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                color: 'rgba(255, 255, 255, 0.85)',
                                '&:hover': { color: '#ffffff' },
                            }}
                        >
                            Live Portal
                        </Button>
                    </Stack>
                )}

                <Box sx={{ flexGrow: 1 }} />

                <FormControlLabel
                    control={
                        <Switch
                            checked={darkMode}
                            onChange={onThemeToggle}
                            color="default"
                            icon={<LightModeIcon />}
                            checkedIcon={<DarkModeIcon />}
                        />
                    }
                    label=""
                />

                {user ? (
                    <Tooltip title={user.name || user.email}>
                        <IconButton component={Link} to="/profile" sx={{ ml: 1 }}>
                            <Avatar sx={{ width: 34, height: 32, bgcolor: 'secondary.main', fontWeight: 700 }}>
                                {(user.name || user.email).charAt(0).toUpperCase()}
                            </Avatar>
                        </IconButton>
                    </Tooltip>
                ) : (
                    <Stack direction="row" spacing={1} sx={{ ml: 1.5 }}>
                        <Button
                            component={Link}
                            to="/login"
                            variant="outlined"
                            size="small"
                            startIcon={<LoginIcon />}
                            sx={{
                                color: '#ffffff',
                                borderColor: 'rgba(255, 255, 255, 0.4)',
                                textTransform: 'none',
                                fontWeight: 600,
                                px: 1.5,
                                '&:hover': {
                                    borderColor: '#ffffff',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                },
                            }}
                        >
                            Sign In
                        </Button>
                        <Button
                            component={Link}
                            to="/login"
                            variant="contained"
                            size="small"
                            startIcon={<RegisterIcon />}
                            sx={{
                                backgroundColor: '#2a5298',
                                color: '#ffffff',
                                textTransform: 'none',
                                fontWeight: 700,
                                px: 1.5,
                                '&:hover': {
                                    backgroundColor: '#1e3c72',
                                },
                            }}
                        >
                            Sign Up
                        </Button>
                    </Stack>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;
