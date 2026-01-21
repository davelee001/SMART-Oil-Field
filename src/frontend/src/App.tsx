import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box, ThemeProvider } from '@mui/material';
import { motion } from 'framer-motion';

import { lightTheme, darkTheme } from './themes/theme';
import Dashboard from './pages/Dashboard';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';

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
                            p: 3,
                            marginTop: '64px',
                            marginLeft: sidebarOpen ? '280px' : '0px',
                            transition: 'margin-left 0.3s ease',
                            backgroundColor: theme.palette.background.default,
                            minHeight: '100vh',
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                            </Routes>
                        </motion.div>
                    </Box>
                </Box>
            </Router>
        </ThemeProvider>
    );
};

export default App;