import React, { useMemo, useState } from 'react';
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
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    Search as SearchIcon,
    TrendingUp,
    Warning,
    CheckCircle,
    Error,
    PictureAsPdf,
    TableChart,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

import TelemetryChart from '../components/charts/TelemetryChart';
import OilFieldMap from '../components/maps/OilFieldMap';
import LoadingCard from '../components/common/LoadingCard';

interface OilWellRow {
    id: string;
    name: string;
    location: string;
    status: 'active' | 'warning' | 'error' | 'inactive';
    production: number;
    temperature: number;
    pressure: number;
    lastUpdated: number;
}

// Mock data - replace with actual API calls
const ALL_WELLS: OilWellRow[] = [
    { id: 'well-001', name: 'Well Alpha-1', location: 'Houston, TX', status: 'active', production: 150.2, temperature: 75.5, pressure: 200.0, lastUpdated: Date.now() - 1000 * 60 * 30 },
    { id: 'well-002', name: 'Well Beta-2', location: 'Midland, TX', status: 'active', production: 142.8, temperature: 76.1, pressure: 198.5, lastUpdated: Date.now() - 1000 * 60 * 60 * 4 },
    { id: 'well-003', name: 'Well Gamma-3', location: 'Odessa, TX', status: 'warning', production: 95.3, temperature: 82.1, pressure: 185.2, lastUpdated: Date.now() - 1000 * 60 * 60 * 12 },
    { id: 'well-004', name: 'Well Delta-4', location: 'Permian Basin, TX', status: 'error', production: 0, temperature: 0, pressure: 0, lastUpdated: Date.now() - 1000 * 60 * 60 * 36 },
    { id: 'well-005', name: 'Well Epsilon-5', location: 'Eagle Ford, TX', status: 'active', production: 168.4, temperature: 74.9, pressure: 205.3, lastUpdated: Date.now() - 1000 * 60 * 60 * 2 },
    { id: 'well-006', name: 'Well Zeta-6', location: 'Bakken, ND', status: 'inactive', production: 0, temperature: 68.2, pressure: 0, lastUpdated: Date.now() - 1000 * 60 * 60 * 50 },
];

type QuickFilter = 'all' | 'active' | 'warning' | '24h';

const Dashboard: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
    const [loading, setLoading] = useState(false);

    const filteredWells = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return ALL_WELLS.filter((well) => {
            const matchesSearch =
                term === '' ||
                well.name.toLowerCase().includes(term) ||
                well.location.toLowerCase().includes(term);
            if (!matchesSearch) return false;

            switch (quickFilter) {
                case 'active':
                    return well.status === 'active';
                case 'warning':
                    return well.status === 'warning' || well.status === 'error';
                case '24h':
                    return Date.now() - well.lastUpdated < 24 * 60 * 60 * 1000;
                default:
                    return true;
            }
        });
    }, [searchTerm, quickFilter]);

    const stats = useMemo(() => {
        const activeWells = filteredWells.filter((w) => w.status === 'active').length;
        const warningWells = filteredWells.filter((w) => w.status === 'warning').length;
        const errorWells = filteredWells.filter((w) => w.status === 'error').length;
        const totalProduction = filteredWells.reduce((sum, w) => sum + w.production, 0);
        const avgTemperature =
            filteredWells.length > 0
                ? filteredWells.reduce((sum, w) => sum + w.temperature, 0) / filteredWells.length
                : 0;

        return {
            totalWells: filteredWells.length,
            activeWells,
            warningWells,
            errorWells,
            totalProduction: `${totalProduction.toFixed(1)} bbl`,
            avgTemperature: `${avgTemperature.toFixed(1)}°F`,
        };
    }, [filteredWells]);

    const applyQuickFilter = (filter: QuickFilter, label: string) => {
        setQuickFilter(filter);
        toast.info(`Filter applied: ${label}`);
    };

    const handleExportPDF = () => {
        if (filteredWells.length === 0) {
            toast.warning('No wells match the current filters — nothing to export');
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('SMART Oil Field - Well Report', 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

        const headers = ['Well', 'Location', 'Status', 'Prod. (bbl/day)', 'Temp (°F)', 'Pressure (PSI)'];
        const colX = [14, 55, 100, 128, 160, 182];
        let y = 32;

        doc.setFont('helvetica', 'bold');
        headers.forEach((header, i) => doc.text(header, colX[i], y));
        doc.setLineWidth(0.1);
        doc.line(14, y + 2, 196, y + 2);
        doc.setFont('helvetica', 'normal');
        y += 8;

        filteredWells.forEach((well) => {
            if (y > 280) {
                doc.addPage();
                y = 20;
            }
            doc.text(well.name, colX[0], y);
            doc.text(well.location, colX[1], y);
            doc.text(well.status, colX[2], y);
            doc.text(well.production.toFixed(1), colX[3], y);
            doc.text(well.temperature.toFixed(1), colX[4], y);
            doc.text(well.pressure.toFixed(1), colX[5], y);
            y += 7;
        });

        doc.save(`oil-field-report-${Date.now()}.pdf`);
        toast.success(`Exported ${filteredWells.length} well(s) to PDF`);
    };

    const handleExportExcel = () => {
        if (filteredWells.length === 0) {
            toast.warning('No wells match the current filters — nothing to export');
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(
            filteredWells.map((well) => ({
                Well: well.name,
                Location: well.location,
                Status: well.status,
                'Production (bbl/day)': well.production,
                'Temperature (°F)': well.temperature,
                'Pressure (PSI)': well.pressure,
            }))
        );
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Oil Wells');
        XLSX.writeFile(workbook, `oil-field-report-${Date.now()}.xlsx`);
        toast.success(`Exported ${filteredWells.length} well(s) to Excel`);
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
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Button
                                        variant={quickFilter === 'all' ? 'contained' : 'outlined'}
                                        size="small"
                                        onClick={() => applyQuickFilter('all', 'All Wells')}
                                    >
                                        All Wells
                                    </Button>
                                    <Button
                                        variant={quickFilter === 'active' ? 'contained' : 'outlined'}
                                        size="small"
                                        onClick={() => applyQuickFilter('active', 'Active Only')}
                                    >
                                        Active Only
                                    </Button>
                                    <Button
                                        variant={quickFilter === 'warning' ? 'contained' : 'outlined'}
                                        size="small"
                                        color="warning"
                                        onClick={() => applyQuickFilter('warning', 'Warnings')}
                                    >
                                        Warnings
                                    </Button>
                                    <Button
                                        variant={quickFilter === '24h' ? 'contained' : 'outlined'}
                                        size="small"
                                        onClick={() => applyQuickFilter('24h', 'Last 24h')}
                                    >
                                        Last 24h
                                    </Button>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<PictureAsPdf />}
                                        onClick={handleExportPDF}
                                    >
                                        Export PDF
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<TableChart />}
                                        onClick={handleExportExcel}
                                    >
                                        Export Excel
                                    </Button>
                                </Box>
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

                {/* Well Details Table */}
                <motion.div variants={cardVariants}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Well Details ({filteredWells.length})
                            </Typography>
                            {loading ? (
                                <LoadingCard height={250} />
                            ) : (
                                <TableContainer>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Well</TableCell>
                                                <TableCell>Location</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell align="right">Production (bbl/day)</TableCell>
                                                <TableCell align="right">Temp (°F)</TableCell>
                                                <TableCell align="right">Pressure (PSI)</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filteredWells.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} align="center">
                                                        No wells match the current search/filter.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredWells.map((well) => (
                                                    <TableRow key={well.id} hover>
                                                        <TableCell>{well.name}</TableCell>
                                                        <TableCell>{well.location}</TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={well.status}
                                                                size="small"
                                                                color={
                                                                    well.status === 'active'
                                                                        ? 'success'
                                                                        : well.status === 'warning'
                                                                            ? 'warning'
                                                                            : well.status === 'error'
                                                                                ? 'error'
                                                                                : 'default'
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">{well.production.toFixed(1)}</TableCell>
                                                        <TableCell align="right">{well.temperature.toFixed(1)}</TableCell>
                                                        <TableCell align="right">{well.pressure.toFixed(1)}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
        </Container>
    );
};

export default Dashboard;