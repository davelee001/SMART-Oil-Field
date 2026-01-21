import React from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Switch,
    FormControlLabel,
    Box,
} from '@mui/material';
import {
    Menu as MenuIcon,
    Brightness4 as DarkModeIcon,
    Brightness7 as LightModeIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

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
    return (
        <AppBar
            position="fixed"
            sx={{
                zIndex: (theme) => theme.zIndex.drawer + 1,
                background: (theme) =>
                    darkMode
                        ? 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)'
                        : 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            }}
        >
            <Toolbar>
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
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
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
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;