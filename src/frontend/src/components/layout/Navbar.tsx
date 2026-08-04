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
} from '@mui/material';
import {
    Menu as MenuIcon,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

import { getStoredUser } from '../../utils/auth';

interface NavbarProps {
    onThemeToggle: () => void;
    darkMode: boolean;
    onSidebarToggle: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
    onThemeToggle,
    darkMode,
    onSidebarToggle,
}) => {
    const user = getStoredUser();

    return (
        <AppBar
            position="fixed"
            sx={{
                zIndex: (theme) => theme.zIndex.drawer + 1,
                background: (theme) =>
                    darkMode
                        ? 'linear-gradient(110deg, #0B1720 0%, #142B39 100%)'
                        : 'linear-gradient(110deg, #0F2942 0%, #173F5F 68%, #1A5563 100%)',
            }}
        >
            <Toolbar sx={{ minHeight: '64px !important', px: { xs: 2, sm: 3 } }}>
                <IconButton
                    color="inherit"
                    onClick={onSidebarToggle}
                    edge="start"
                    sx={{ mr: 2 }}
                >
                    <MenuIcon />
                </IconButton>

                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{ flexGrow: 1, fontWeight: 750, letterSpacing: '-0.015em' }}
                    >
                        SMART Oil Field Dashboard
                    </Typography>
                </motion.div>

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

                <Tooltip title={user ? user.name || user.email : 'Sign in'}>
                    <IconButton component={Link} to={user ? '/profile' : '/login'} sx={{ ml: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                            {user ? (user.name || user.email).charAt(0).toUpperCase() : '?'}
                        </Avatar>
                    </IconButton>
                </Tooltip>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;
