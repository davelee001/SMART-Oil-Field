import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box, ThemeProvider } from '@mui/material';
import { motion } from 'framer-motion';

import { lightTheme, darkTheme } from './themes/theme';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Subscriptions from './pages/Subscriptions';
import PaymentHistory from './pages/PaymentHistory';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import ProtectedRoute from './components/common/ProtectedRoute';

const App: React.FC = () => {
    const [darkMode, setDarkMode] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const theme = darkMode ? darkTheme : lightTheme;

    const toggleTheme = () => {
        setDarkMode(!darkMode);
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <ThemeProvider theme={theme}>
            <Router>
                <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                    <Navbar
                        onThemeToggle={toggleTheme}
                        darkMode={darkMode}
                        onSidebarToggle={toggleSidebar}
                    />

                    <Sidebar open={sidebarOpen} />

                    <Box
                        component="main"
                        sx={{
                            flexGrow: 1,
                            minWidth: 0,
                            width: '100%',
                            p: { xs: 1.5, sm: 2, lg: 3 },
                            marginTop: '64px',
                            backgroundColor: theme.palette.background.default,
                            minHeight: 'calc(100vh - 64px)',
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            style={{ width: '100%' }}
                        >
                            <Routes>
                                {/* Public Landing Page */}
                                <Route path="/" element={<Home />} />
                                <Route path="/login" element={<Login />} />

                                {/* Protected Application Pages */}
                                <Route
                                    path="/dashboard"
                                    element={
                                        <ProtectedRoute>
                                            <Dashboard />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/profile"
                                    element={
                                        <ProtectedRoute>
                                            <Profile />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/subscriptions"
                                    element={
                                        <ProtectedRoute>
                                            <Subscriptions />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route
                                    path="/payment-history"
                                    element={
                                        <ProtectedRoute>
                                            <PaymentHistory />
                                        </ProtectedRoute>
                                    }
                                />
                            </Routes>
                        </motion.div>
                    </Box>
                </Box>
            </Router>
        </ThemeProvider>
    );
};

export default App;
