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
    IconButton,
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
    Clear as ClearIcon,
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

// Realistic rich datasets for populated dashboard
const ALL_WELLS: OilWellRow[] = [
    { id: 'well-001', name: 'Alpha Main Rig #1', location: 'Permian Basin, TX', status: 'active', production: 285.4, temperature: 78.2, pressure: 215.0, lastUpdated: Date.now() - 1000 * 60 * 5 },
    { id: 'well-002', name: 'Beta Sector Deep', location: 'Eagle Ford, TX', status: 'active', production: 310.8, temperature: 76.8, pressure: 228.5, lastUpdated: Date.now() - 1000 * 60 * 12 },
    { id: 'well-003', name: 'Gamma North Sub', location: 'Midland, TX', status: 'warning', production: 145.2, temperature: 88.6, pressure: 172.4, lastUpdated: Date.now() - 1000 * 60 * 25 },
    { id: 'well-004', name: 'Delta Offshore #4', location: 'Gulf of Mexico', status: 'error', production: 0.0, temperature: 0.0, pressure: 0.0, lastUpdated: Date.now() - 1000 * 60 * 120 },
    { id: 'well-005', name: 'Epsilon Shale #5', location: 'Bakken, ND', status: 'active', production: 242.1, temperature: 71.5, pressure: 204.8, lastUpdated: Date.now() - 1000 * 60 * 8 },
    { id: 'well-006', name: 'Zeta Basin East', location: 'Odessa, TX', status: 'active', production: 198.7, temperature: 74.3, pressure: 195.2, lastUpdated: Date.now() - 1000 * 60 * 18 },
    { id: 'well-007', name: 'Eta Heavy Crude #7', location: 'Marcellus, PA', status: 'warning', production: 112.0, temperature: 84.1, pressure: 168.0, lastUpdated: Date.now() - 1000 * 60 * 45 },
    { id: 'well-008', name: 'Theta Deep Drill #8', location: 'Anadarko, OK', status: 'active', production: 340.5, temperature: 79.0, pressure: 235.1, lastUpdated: Date.now() - 1000 * 60 * 2 },
];

type QuickFilter = 'all' | 'active' | 'warning' | '24h';

const Dashboard: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
    const [loading, setLoading] = useState(false);
    const hasSearch = searchTerm.trim().length > 0;

    const filteredWells = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return ALL_WELLS.filter((well) => {
            const matchesSearch =
                term === '' ||
                [
                    well.id,
                    well.name,
                    well.location,
                    well.status,
                    well.production,
                    well.temperature,
                    well.pressure,
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(term);
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
        <Container maxWidth={false} sx={{ py: 1, px: { xs: 1.5, sm: 2, md: 3 } }}>
            <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                    visible: {
                        transition: {
                            staggerChildren: 0.08,
                        },
                    },
                }}
            >
                {/* Header */}
                <motion.div variants={cardVariants}>
                    <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Box>
                            <Typography variant="h4" color="primary" fontWeight={800} gutterBottom sx={{ mb: 0.5 }}>
                                Operational Telemetry & Analytics
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Live IoT sensor feeds, spatial map distributions, and AI anomaly tracking.
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip label="Aptos Testnet: Connected" color="success" size="small" variant="outlined" />
                            <Chip label="IoT Gateway: 100ms" color="info" size="small" variant="outlined" />
                        </Box>
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
                                    endAdornment: hasSearch ? (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="Clear well search"
                                                size="small"
                                                onClick={() => setSearchTerm('')}
                                            >
                                                <ClearIcon />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : undefined,
                                }}
                                sx={{ mb: hasSearch ? 1 : 2 }}
                            />

                            {hasSearch && (
                                <Box
                                    aria-live="polite"
                                    sx={{
                                        mb: 2,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        backgroundColor: 'background.paper',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            px: 2,
                                            py: 1,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            backgroundColor: 'background.default',
                                            borderBottom: filteredWells.length > 0 ? '1px solid' : 0,
                                            borderColor: 'divider',
                                        }}
                                    >
                                        <Typography variant="subtitle2" fontWeight={750}>
                                            Search results
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {filteredWells.length} {filteredWells.length === 1 ? 'well' : 'wells'} found
                                        </Typography>
                                    </Box>

                                    {filteredWells.length === 0 ? (
                                        <Box sx={{ px: 2, py: 2.5, textAlign: 'center' }}>
                                            <Typography fontWeight={650}>No matching wells found</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Try a well name, ID, location, status, or telemetry value.
                                            </Typography>
                                        </Box>
                                    ) : (
                                        filteredWells.map((well) => (
                                            <Box
                                                key={well.id}
                                                sx={{
                                                    display: 'grid',
                                                    gridTemplateColumns: {
                                                        xs: '1fr 1fr',
                                                        md: 'minmax(180px, 1.4fr) minmax(150px, 1fr) 110px repeat(3, minmax(90px, 0.7fr))',
                                                    },
                                                    gap: { xs: 1.25, md: 2 },
                                                    alignItems: 'center',
                                                    px: 2,
                                                    py: 1.5,
                                                    '& + &': {
                                                        borderTop: '1px solid',
                                                        borderColor: 'divider',
                                                    },
                                                    '&:hover': { backgroundColor: 'action.hover' },
                                                }}
                                            >
                                                <Box>
                                                    <Typography variant="body2" fontWeight={750}>{well.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{well.id}</Typography>
                                                </Box>
                                                <Typography variant="body2">{well.location}</Typography>
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
                                                    sx={{ justifySelf: 'start' }}
                                                />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">Production</Typography>
                                                    <Typography variant="body2" fontWeight={650}>{well.production.toFixed(1)} bbl/d</Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">Temperature</Typography>
                                                    <Typography variant="body2" fontWeight={650}>{well.temperature.toFixed(1)}°F</Typography>
                                                </Box>
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">Pressure</Typography>
                                                    <Typography variant="body2" fontWeight={650}>{well.pressure.toFixed(1)} PSI</Typography>
                                                </Box>
                                            </Box>
                                        ))
                                    )}
                                </Box>
                            )}

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
                {!hasSearch && (
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
                )}
            </motion.div>
        </Container>
    );
};

export default Dashboard;
