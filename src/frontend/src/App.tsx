import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Box, ThemeProvider } from '@mui/material';
import { motion } from 'framer-motion';

import { lightTheme, darkTheme } from './themes/theme';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Subscriptions from './pages/Subscriptions';
import PaymentHistory from './pages/PaymentHistory';
import AdminUsers from './pages/AdminUsers';
import Projects from './pages/Projects';
import Finance from './pages/Finance';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import ProtectedRoute from './components/common/ProtectedRoute';

const AppContent: React.FC = () => {
    const [darkMode, setDarkMode] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();

    const theme = darkMode ? darkTheme : lightTheme;
    const isPublicRoute = location.pathname === '/' || location.pathname === '/login';

    const toggleTheme = () => {
        setDarkMode(!darkMode);
    };

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <ThemeProvider theme={theme}>
            <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: theme.palette.background.default }}>
                <Navbar
                    onThemeToggle={toggleTheme}
                    darkMode={darkMode}
                    onSidebarToggle={toggleSidebar}
                    isPublicPage={isPublicRoute}
                />

                {!isPublicRoute && <Sidebar open={sidebarOpen} />}

                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        minWidth: 0,
                        width: '100%',
                        p: isPublicRoute ? 0 : { xs: 1.5, sm: 2, lg: 3 },
                        marginTop: '64px',
                        minHeight: 'calc(100vh - 64px)',
                        transition: 'padding 0.2s ease-in-out',
                    }}
                >
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ width: '100%' }}
                    >
                        <Routes>
                            {/* Public Landing Page & Auth */}
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
                            <Route
                                path="/projects"
                                element={
                                    <ProtectedRoute>
                                        <Projects />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/users"
                                element={
                                    <ProtectedRoute roles={['ADMINISTRATOR']}>
                                        <AdminUsers />
                                    </ProtectedRoute>
                                }
                            />
                        </Routes>
                    </motion.div>
                </Box>
            </Box>
        </ThemeProvider>
    );
};

const App: React.FC = () => {
    return (
        <Router>
            <AppContent />
        </Router>
    );
};

export default App;
