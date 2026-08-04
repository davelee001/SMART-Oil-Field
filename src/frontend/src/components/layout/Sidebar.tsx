import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Box,
    Divider,
} from '@mui/material';
import {
    Home as HomeIcon,
    Dashboard as DashboardIcon,
    Analytics as AnalyticsIcon,
    Map as MapIcon,
    Settings as SettingsIcon,
    CloudUpload as UploadIcon,
    Download as DownloadIcon,
    Person as PersonIcon,
    Subscriptions as SubscriptionsIcon,
    Receipt as ReceiptIcon,
    Lock as LockIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { getStoredUser } from '../../utils/auth';

interface SidebarProps {
    open: boolean;
}

const PUBLIC_PATHS = ['/'];

const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/', isPublic: true },
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', isPublic: false },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics', isPublic: false },
    { text: 'Map View', icon: <MapIcon />, path: '/map', isPublic: false },
    { text: 'Data Upload', icon: <UploadIcon />, path: '/upload', isPublic: false },
    { text: 'Export Data', icon: <DownloadIcon />, path: '/export', isPublic: false },
    { text: 'Subscriptions', icon: <SubscriptionsIcon />, path: '/subscriptions', isPublic: false },
    { text: 'Payment History', icon: <ReceiptIcon />, path: '/payment-history', isPublic: false },
    { text: 'Profile', icon: <PersonIcon />, path: '/profile', isPublic: false },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings', isPublic: false },
];

const Sidebar: React.FC<SidebarProps> = ({ open }) => {
    const location = useLocation();
    const user = getStoredUser();

    return (
        <Drawer
            variant="persistent"
            anchor="left"
            open={open}
            sx={{
                width: 280,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: 280,
                    boxSizing: 'border-box',
                    marginTop: '64px',
                    height: 'calc(100vh - 64px)',
                },
            }}
        >
            <Box sx={{ p: 2 }}>
                <Typography variant="h6" color="primary">
                    Navigation
                </Typography>
            </Box>

            <Divider />

            <List>
                {menuItems.map((item, index) => (
                    <motion.div
                        key={item.text}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                        <ListItem disablePadding>
                            <ListItemButton
                                component={Link}
                                to={item.path}
                                selected={location.pathname === item.path}
                                sx={{
                                    borderLeft: '3px solid transparent',
                                    '&.Mui-selected': {
                                        borderColor: 'primary.main',
                                        backgroundColor: (theme) =>
                                            theme.palette.mode === 'dark'
                                                ? 'rgba(112, 167, 204, 0.14)'
                                                : 'rgba(23, 63, 95, 0.09)',
                                    },
                                    '&:hover': {
                                        backgroundColor: (theme) =>
                                            theme.palette.mode === 'dark'
                                                ? 'rgba(255, 255, 255, 0.08)'
                                                : 'rgba(30, 60, 114, 0.08)',
                                    },
                                }}
                            >
                                <ListItemIcon sx={{ color: 'primary.main', minWidth: 36 }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText primary={item.text} />
                                {!item.isPublic && !user && (
                                    <LockIcon sx={{ fontSize: 16, color: 'text.disabled', ml: 1 }} />
                                )}
                            </ListItemButton>
                        </ListItem>
                    </motion.div>
                ))}
            </List>
        </Drawer>
    );
};

export default Sidebar;
