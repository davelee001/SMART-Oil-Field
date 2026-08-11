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
    ManageAccounts as ManageAccountsIcon,
    AccountTree as ProjectsIcon,
    AccountBalanceWallet as FinanceIcon,
    Policy as ComplianceIcon,
    LocalShipping as SupplyChainIcon,
    TrackChanges as PerformanceIcon,
    School as TrainingIcon,
    Assessment as ReportsIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { Theme } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import { PmsRole } from '../../utils/auth';

interface SidebarProps {
    open: boolean;
}

const menuItems: Array<{ text: string; icon: React.ReactNode; path: string; roles?: PmsRole[] }> = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Projects', icon: <ProjectsIcon />, path: '/projects' },
    { text: 'Budgeting & Finance', icon: <FinanceIcon />, path: '/finance' },
    { text: 'Compliance', icon: <ComplianceIcon />, path: '/compliance' },
    { text: 'Suppliers & Supply Chain', icon: <SupplyChainIcon />, path: '/supply-chain' },
    { text: 'KPI Performance', icon: <PerformanceIcon />, path: '/performance' },
    { text: 'Training & Capacity', icon: <TrainingIcon />, path: '/training' },
    { text: 'Formal Reports', icon: <ReportsIcon />, path: '/reports' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
    { text: 'Map View', icon: <MapIcon />, path: '/map' },
    { text: 'Data Upload', icon: <UploadIcon />, path: '/upload' },
    { text: 'Export Data', icon: <DownloadIcon />, path: '/export' },
    { text: 'Subscriptions', icon: <SubscriptionsIcon />, path: '/subscriptions' },
    { text: 'Payment History', icon: <ReceiptIcon />, path: '/payment-history' },
    { text: 'Profile', icon: <PersonIcon />, path: '/profile' },
    { text: 'User Management', icon: <ManageAccountsIcon />, path: '/admin/users', roles: ['ADMINISTRATOR'] },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

const Sidebar: React.FC<SidebarProps> = ({ open }) => {
    const location = useLocation();
    const { user } = useAuth();
    const visibleMenuItems = menuItems.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

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
                {visibleMenuItems.map((item, index) => (
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
                                        backgroundColor: (theme: Theme) =>
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
                            </ListItemButton>
                        </ListItem>
                    </motion.div>
                ))}
            </List>
        </Drawer>
    );
};

export default Sidebar;
