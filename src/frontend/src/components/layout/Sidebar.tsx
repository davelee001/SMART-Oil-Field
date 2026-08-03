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
    Dashboard as DashboardIcon,
    Analytics as AnalyticsIcon,
    Map as MapIcon,
    Settings as SettingsIcon,
    CloudUpload as UploadIcon,
    Download as DownloadIcon,
    Person as PersonIcon,
    Subscriptions as SubscriptionsIcon,
    Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface SidebarProps {
    open: boolean;
}

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
    { text: 'Map View', icon: <MapIcon />, path: '/map' },
    { text: 'Data Upload', icon: <UploadIcon />, path: '/upload' },
    { text: 'Export Data', icon: <DownloadIcon />, path: '/export' },
    { text: 'Subscriptions', icon: <SubscriptionsIcon />, path: '/subscriptions' },
    { text: 'Payment History', icon: <ReceiptIcon />, path: '/payment-history' },
    { text: 'Profile', icon: <PersonIcon />, path: '/profile' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

const Sidebar: React.FC<SidebarProps> = ({ open }) => {
    const location = useLocation();

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
                                    '&:hover': {
                                        backgroundColor: (theme) =>
                                            theme.palette.mode === 'dark'
                                                ? 'rgba(255, 255, 255, 0.08)'
                                                : 'rgba(30, 60, 114, 0.08)',
                                    },
                                }}
                            >
                                <ListItemIcon sx={{ color: 'primary.main' }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText primary={item.text} />
                            </ListItemButton>
                        </ListItem>
                    </motion.div>
                ))}
            </List>
        </Drawer>
    );
};

export default Sidebar;