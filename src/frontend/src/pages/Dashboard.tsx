import React, { useState } from 'react';
import {
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    Button,
    TextField,
    InputAdornment,
    Skeleton,
} from '@mui/material';
import {
    Search as SearchIcon,
    TrendingUp,
    Warning,
    CheckCircle,
    Error,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

import TelemetryChart from '../components/charts/TelemetryChart';
import OilFieldMap from '../components/maps/OilFieldMap';
import LoadingCard from '../components/common/LoadingCard';

const Dashboard: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    // Mock data - replace with actual API calls
    const stats = {
        totalWells: 45,
        activeWells: 42,
        warningWells: 2,
        errorWells: 1,
        totalProduction: '1,234 bbl',
        avgTemperature: '85°F',
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <Container maxWidth={false} sx={{ mt: 2 }}>
            <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                    visible: {
                        transition: {
                            staggerChildren: 0.1,
                        },
                    },
                }}
            >
                {/* Header */}
                <motion.div variants={cardVariants}>
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h1" color="primary" gutterBottom>
                            SMART Oil Field Dashboard
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Real-time monitoring and analytics for oil field operations
                        </Typography>
                    </Box>
                </motion.div>

                {/* Search Bar */}
                <motion.div variants={cardVariants}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <TextField
                                fullWidth
                                placeholder="Search wells, locations, or data..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ mb: 2 }}
                            />
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Button variant="outlined" size="small">
                                    All Wells
                                </Button>
                                <Button variant="outlined" size="small">
                                    Active Only
                                </Button>
                                <Button variant="outlined" size="small">
                                    Warnings
                                </Button>
                                <Button variant="outlined" size="small">
                                    Last 24h
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Stats Cards */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <motion.div variants={cardVariants}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <CheckCircle color="success" sx={{ mr: 1 }} />
                                        <Typography variant="h6">Total Wells</Typography>
                                    </Box>
                                    <Typography variant="h4" color="success.main">
                                        {stats.totalWells}
                                    </Typography>
                                    <Chip
                                        label="Active"
                                        color="success"
                                        size="small"
                                        sx={{ mt: 1 }}
                                    />
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <motion.div variants={cardVariants}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <TrendingUp color="primary" sx={{ mr: 1 }} />
                                        <Typography variant="h6">Production</Typography>
                                    </Box>
                                    <Typography variant="h4" color="primary.main">
                                        {stats.totalProduction}
                                    </Typography>
                                    <Chip
                                        label="+5.2% vs yesterday"
                                        color="primary"
                                        size="small"
                                        sx={{ mt: 1 }}
                                    />
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <motion.div variants={cardVariants}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <Warning color="warning" sx={{ mr: 1 }} />
                                        <Typography variant="h6">Warnings</Typography>
                                    </Box>
                                    <Typography variant="h4" color="warning.main">
                                        {stats.warningWells}
                                    </Typography>
                                    <Chip
                                        label="Requires attention"
                                        color="warning"
                                        size="small"
                                        sx={{ mt: 1 }}
                                    />
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <motion.div variants={cardVariants}>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <Error color="error" sx={{ mr: 1 }} />
                                        <Typography variant="h6">Errors</Typography>
                                    </Box>
                                    <Typography variant="h4" color="error.main">
                                        {stats.errorWells}
                                    </Typography>
                                    <Chip
                                        label="Critical"
                                        color="error"
                                        size="small"
                                        sx={{ mt: 1 }}
                                    />
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>
                </Grid>

                {/* Charts and Map */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} lg={8}>
                        <motion.div variants={cardVariants}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Real-time Telemetry Data
                                    </Typography>
                                    {loading ? (
                                        <LoadingCard />
                                    ) : (
                                        <TelemetryChart />
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>

                    <Grid item xs={12} lg={4}>
                        <motion.div variants={cardVariants}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Oil Field Locations
                                    </Typography>
                                    {loading ? (
                                        <LoadingCard height={300} />
                                    ) : (
                                        <OilFieldMap />
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>
                </Grid>
            </motion.div>
        </Container>
    );
};

export default Dashboard;