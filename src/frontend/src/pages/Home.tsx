import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Button,
    Grid,
    Card,
    CardContent,
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    TextField,
    Stack,
    Paper,
    Divider,
    Avatar,
    InputAdornment,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    AnalyticsOutlined as AnalyticsIcon,
    SecurityOutlined as BlockchainIcon,
    SensorsOutlined as TelemetryIcon,
    NotificationsActiveOutlined as AlertIcon,
    SpeedOutlined as SpeedIcon,
    AutoAwesome as SparklesIcon,
    CheckCircleOutline as CheckIcon,
    ArrowForward as ArrowForwardIcon,
    PlayCircleOutline as DemoIcon,
    MailOutline as EmailIcon,
    MonetizationOnOutlined as PricingIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Opacity as OilIcon,
    Engineering as RigIcon,
    ShieldOutlined as ShieldIcon,
    NewspaperOutlined as NewsIcon,
    HubOutlined as PipelineIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

// Real-time Global Energy Commodities Ticker Data
const MARKET_PRICES = [
    { name: 'Brent Crude', symbol: 'BRENT', price: '$78.42', unit: '/bbl', change: '+1.35%', positive: true, high: '$79.10', low: '$77.20', volume: '342K bbls' },
    { name: 'WTI Crude', symbol: 'WTI', price: '$74.18', unit: '/bbl', change: '+0.92%', positive: true, high: '$75.05', low: '$73.50', volume: '410K bbls' },
    { name: 'Natural Gas', symbol: 'NG', price: '$2.15', unit: '/MMBtu', change: '-0.46%', positive: false, high: '$2.22', low: '$2.10', volume: '180K MMBtu' },
    { name: 'OPEC Basket', symbol: 'OPEC', price: '$81.10', unit: '/bbl', change: '+1.10%', positive: true, high: '$81.80', low: '$80.20', volume: '520K bbls' },
    { name: 'Gasoline RBOB', symbol: 'RBOB', price: '$2.38', unit: '/gal', change: '+0.75%', positive: true, high: '$2.42', low: '$2.32', volume: '115K gals' },
    { name: 'Heating Oil', symbol: 'HO', price: '$2.49', unit: '/gal', change: '-0.12%', positive: false, high: '$2.53', low: '$2.45', volume: '95K gals' },
];

// Oil & Gas Core Solutions across Upstream, Midstream & Downstream
const ENERGY_SOLUTIONS = [
    {
        icon: <RigIcon sx={{ fontSize: 36, color: '#0F2942' }} />,
        category: 'Upstream Operations',
        title: 'Wellhead Telemetry & IoT',
        description: 'Real-time monitoring of pressure, temperature, ESP vibration, and flow rates across remote oil wellheads with automated SCADA feeds.',
        tag: 'Sub-Second Polling',
    },
    {
        icon: <PipelineIcon sx={{ fontSize: 36, color: '#173F5F' }} />,
        category: 'Midstream Logistics',
        title: 'Pipeline & Tanker Tracking',
        description: 'End-to-end custody transfer tracking for crude movement from wellhead storage to refinery terminals with GPS & flow-meter logs.',
        tag: 'Custody Transfer',
    },
    {
        icon: <BlockchainIcon sx={{ fontSize: 36, color: '#1A5563' }} />,
        category: 'Blockchain Auditability',
        title: 'Aptos Move Crude Provenance',
        description: 'Publish immutable, cryptographically signed crude batch quality certificates, sulfur content, and API gravity logs to the blockchain.',
        tag: 'Aptos Smart Contracts',
    },
    {
        icon: <AnalyticsIcon sx={{ fontSize: 36, color: '#236A8D' }} />,
        category: 'Predictive Analytics',
        title: 'AI Pressure & Anomaly Detection',
        description: 'Machine learning ensemble models detect downhole pump degradation, casing pressure spikes, and flow restrictions before line failure.',
        tag: 'ML Anomaly Engine',
    },
    {
        icon: <AlertIcon sx={{ fontSize: 36, color: '#e65100' }} />,
        category: 'HSE & Safety',
        title: 'H2S & Environmental Safety Alerts',
        description: 'Instant multi-channel alerts (SMS, Email, Push) triggered by toxic gas threshold breaches, leak detection, or sudden pressure drops.',
        tag: 'Multi-Channel Alerts',
    },
    {
        icon: <PricingIcon sx={{ fontSize: 36, color: '#2e7d32' }} />,
        category: 'Commercial & Tokenomics',
        title: 'APT Crude Settlement Billing',
        description: 'Automated multi-token oilfield lease payments, volume-based royalty distributions, and tier plans payable in APT tokens.',
        tag: 'Aptos Settlement',
    },
];

// Global Industry Metrics
const INDUSTRY_STATS = [
    { label: 'Monitored Oil Wells', value: '1,420+', detail: 'Across Permian, Bakken & GoM' },
    { label: 'Daily Barrels Tracked', value: '850K bbl', detail: 'Real-time flow meter verification' },
    { label: 'IoT Sensor Data Points', value: '62M / day', detail: 'Sub-second WebSocket stream' },
    { label: 'On-Chain Provenance Certs', value: '124,000+', detail: 'Aptos Move verified records' },
];

// Crude Oil Grade Reference
const CRUDE_GRADES = [
    { grade: 'Light Sweet Crude', api: '38° - 42° API', sulfur: '< 0.5%', region: 'WTI / Brent', status: 'Optimal Refining' },
    { grade: 'Medium Crude', api: '26° - 31° API', sulfur: '0.5% - 1.5%', region: 'OPEC Heavy / GoM', status: 'Standard Yield' },
    { grade: 'Heavy Sour Crude', api: '18° - 24° API', sulfur: '> 2.0%', region: 'Canadian Western / Maya', status: 'Specialized Processing' },
];

// Energy FAQs
const ENERGY_FAQS = [
    {
        q: 'What is SMART Oil Field?',
        a: 'SMART Oil Field is an enterprise-grade digital oilfield platform integrating industrial SCADA/IoT sensors, AI predictive maintenance, and Aptos Move blockchain verification to optimize upstream well production and midstream custody transfers.',
    },
    {
        q: 'How does live oil market pricing integrate with well telemetry?',
        a: 'Our platform correlates real-time crude benchmark prices (Brent, WTI, OPEC Basket) with active wellhead production volumes to compute live gross revenue yields and operational profitability for energy operators.',
    },
    {
        q: 'How are crude batch quality and custody records secured on Aptos?',
        a: 'When crude batches transition between well storage, pipeline transport, and refinery terminals, smart contracts on Aptos issue immutable provenance certificates logging API gravity, viscosity, sulfur %, and GPS timestamps.',
    },
    {
        q: 'Can existing SCADA, Modbus, or MQTT hardware connect to the platform?',
        a: 'Yes! Our high-throughput Python FastAPI and TypeScript gateways expose open REST, GraphQL, and WebSocket endpoints tailored for seamless SCADA bridge integration.',
    },
    {
        q: 'How do automated predictive maintenance alerts prevent downtime?',
        a: 'Our machine learning models continuously analyze time-series pressure, temperature, and pump vibration data to detect early signs of valve erosion, paraffin buildup, or gas locks up to 72 hours before failure.',
    },
];

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [newsletterEmail, setNewsletterEmail] = useState('');

    const handleNewsletterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) {
            toast.error('Please enter a valid business email address.');
            return;
        }
        toast.success(`Subscribed! Daily Oil & Gas Intelligence digest sent to ${newsletterEmail}`);
        setNewsletterEmail('');
    };

    return (
        <Box sx={{ width: '100%', minWidth: 0, px: { xs: 1.5, sm: 2, md: 3 }, py: 1.5 }}>
            {/* Live Oil & Energy Market Commodities Bar */}
            <Paper
                elevation={0}
                sx={{
                    mb: 2,
                    p: 1.5,
                    borderRadius: 2,
                    background: (theme) =>
                        theme.palette.mode === 'dark'
                            ? 'linear-gradient(90deg, #0A192F 0%, #112240 100%)'
                            : 'linear-gradient(90deg, #0F2942 0%, #173F5F 100%)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <OilIcon sx={{ color: '#E5A93C', fontSize: 20 }} />
                        <Typography variant="subtitle2" fontWeight={800} sx={{ letterSpacing: '0.03em', textTransform: 'uppercase', fontSize: '0.75rem', color: '#E5A93C' }}>
                            Live Global Crude & Energy Benchmark Markets
                        </Typography>
                    </Box>
                    <Chip
                        icon={<SparklesIcon sx={{ color: '#4CAF50 !important', fontSize: 14 }} />}
                        label="Live Exchange Feed • Updated Every 30s"
                        size="small"
                        sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', height: 22, fontSize: '0.7rem' }}
                    />
                </Box>

                <Grid container spacing={1}>
                    {MARKET_PRICES.map((item) => (
                        <Grid item xs={6} sm={4} md={2} key={item.symbol}>
                            <Box
                                sx={{
                                    p: 1.25,
                                    borderRadius: 1.5,
                                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    transition: 'all 0.2s ease',
                                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
                                }}
                            >
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, display: 'block', fontSize: '0.7rem' }}>
                                    {item.name} ({item.symbol})
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 0.2 }}>
                                    <Typography variant="body2" fontWeight={850} sx={{ color: '#ffffff', fontSize: '0.95rem' }}>
                                        {item.price}
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)' }}>
                                        {item.unit}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                        {item.positive ? (
                                            <TrendingUpIcon sx={{ fontSize: 14, color: '#4CAF50' }} />
                                        ) : (
                                            <TrendingDownIcon sx={{ fontSize: 14, color: '#FF5252' }} />
                                        )}
                                        <Typography
                                            variant="caption"
                                            fontWeight={700}
                                            sx={{ fontSize: '0.7rem', color: item.positive ? '#4CAF50' : '#FF5252' }}
                                        >
                                            {item.change}
                                        </Typography>
                                    </Box>
                                    <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)' }}>
                                        24h Vol: {item.volume}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </Paper>

            {/* Main Oil & Gas Enterprise Hero */}
            <Paper
                elevation={0}
                sx={{
                    background: 'linear-gradient(130deg, #0F2942 0%, #173F5F 50%, #1A5563 100%)',
                    color: '#ffffff',
                    borderRadius: 2,
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    p: { xs: 2.5, sm: 3.5, md: 4 },
                    mb: 2.5,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={7}>
                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap">
                                <Chip
                                    icon={<RigIcon sx={{ color: '#E5A93C !important', fontSize: 16 }} />}
                                    label="Digital Oilfield & Upstream Platform"
                                    size="small"
                                    sx={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', fontWeight: 700 }}
                                />
                                <Chip
                                    icon={<ShieldIcon sx={{ color: '#73C7E8 !important', fontSize: 16 }} />}
                                    label="Aptos Blockchain Verifiable"
                                    size="small"
                                    sx={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff', fontWeight: 700 }}
                                />
                            </Stack>

                            <Typography
                                variant="h3"
                                component="h1"
                                sx={{
                                    fontWeight: 850,
                                    fontSize: { xs: '1.6rem', sm: '2.2rem', md: '2.6rem' },
                                    lineHeight: 1.2,
                                    mb: 1.5,
                                }}
                            >
                                Next-Gen <span style={{ color: '#E5A93C' }}>Oil & Gas</span> Telemetry, AI Analytics & On-Chain Trust
                            </Typography>

                            <Typography
                                variant="body1"
                                sx={{
                                    color: 'rgba(255, 255, 255, 0.88)',
                                    mb: 3,
                                    fontSize: '0.95rem',
                                    lineHeight: 1.6,
                                }}
                            >
                                SMART Oil Field empowers energy operators, pipeline fleets, and petroleum refineries with sub-second SCADA wellhead monitoring, AI pump anomaly forecasting, and cryptographically verified crude oil custody logs on Aptos Move.
                            </Typography>

                            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                                <Button
                                    variant="contained"
                                    size="large"
                                    component={Link}
                                    to="/dashboard"
                                    endIcon={<ArrowForwardIcon />}
                                    sx={{
                                        backgroundColor: '#E5A93C',
                                        color: '#0F2942',
                                        '&:hover': { backgroundColor: '#d19830' },
                                        fontWeight: 800,
                                        borderRadius: 1.5,
                                        px: 3,
                                    }}
                                >
                                    Launch Well Operations Portal
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="large"
                                    component={Link}
                                    to="/login"
                                    startIcon={<DemoIcon />}
                                    sx={{
                                        color: '#ffffff',
                                        borderColor: 'rgba(255, 255, 255, 0.5)',
                                        '&:hover': {
                                            borderColor: '#ffffff',
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        },
                                        fontWeight: 700,
                                        borderRadius: 1.5,
                                        px: 2.5,
                                    }}
                                >
                                    Sign In / Register
                                </Button>
                            </Stack>
                        </motion.div>
                    </Grid>

                    {/* Live Oil Field Operations Snapshot */}
                    <Grid item xs={12} md={5}>
                        <Paper
                            elevation={6}
                            sx={{
                                p: 2.5,
                                backgroundColor: 'rgba(10, 25, 47, 0.85)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: 2,
                                color: '#ffffff',
                            }}
                        >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="caption" sx={{ color: '#E5A93C', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800 }}>
                                    LIVE WELLHEAD TELEMETRY FEED
                                </Typography>
                                <Chip label="ONLINE" color="success" size="small" sx={{ height: 18, fontSize: '0.65rem' }} />
                            </Box>
                            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.15)', mb: 2 }} />

                            <Grid container spacing={1.5}>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="rgba(255,255,255,0.7)">Active Rigs Monitored</Typography>
                                    <Typography variant="subtitle1" fontWeight={800} color="#73C7E8">1,420 Active</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="rgba(255,255,255,0.7)">Crude Production</Typography>
                                    <Typography variant="subtitle1" fontWeight={800}>850,240 bbl/d</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="rgba(255,255,255,0.7)">Average Wellhead Pressure</Typography>
                                    <Typography variant="subtitle1" fontWeight={800}>215.4 PSI</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="rgba(255,255,255,0.7)">Downhole Temperature</Typography>
                                    <Typography variant="subtitle1" fontWeight={800}>178.2 °F</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="rgba(255,255,255,0.7)">Water Cut Ratio</Typography>
                                    <Typography variant="body2" fontWeight={700} color="#81c784">12.4% (Normal)</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="rgba(255,255,255,0.7)">Aptos Move Verification</Typography>
                                    <Typography variant="body2" fontWeight={700} color="#73C7E8">Synced (Block #84920)</Typography>
                                </Grid>
                            </Grid>

                            <Button
                                fullWidth
                                variant="contained"
                                size="small"
                                onClick={() => navigate('/dashboard')}
                                sx={{
                                    mt: 2,
                                    backgroundColor: 'rgba(229, 169, 60, 0.9)',
                                    color: '#0F2942',
                                    fontWeight: 800,
                                    '&:hover': { backgroundColor: '#E5A93C' },
                                    textTransform: 'none',
                                    py: 0.8,
                                }}
                            >
                                Open Full Telemetry Dashboard & Maps
                            </Button>
                        </Paper>
                    </Grid>
                </Grid>
            </Paper>

            {/* Key Industry Operational Metrics */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {INDUSTRY_STATS.map((stat) => (
                    <Grid item xs={6} md={3} key={stat.label}>
                        <Paper
                            elevation={1}
                            sx={{
                                p: 2,
                                textAlign: 'center',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderTop: '4px solid #173F5F',
                            }}
                        >
                            <Typography variant="h5" color="primary" fontWeight={850} sx={{ lineHeight: 1.2 }}>
                                {stat.value}
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ my: 0.3, fontSize: '0.85rem' }}>
                                {stat.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {stat.detail}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Comprehensive Oil & Gas Solutions Grid */}
            <Box sx={{ mb: 3 }}>
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography variant="h5" fontWeight={850} color="primary">
                        End-to-End Petroleum & Energy Solutions
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Connecting upstream drilling, midstream transport, and smart contract settlement.
                    </Typography>
                </Box>

                <Grid container spacing={2}>
                    {ENERGY_SOLUTIONS.map((sol) => (
                        <Grid item xs={12} sm={6} md={4} key={sol.title}>
                            <Card
                                elevation={1}
                                sx={{
                                    height: '100%',
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justify: 'space-between',
                                }}
                            >
                                <CardContent sx={{ p: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                        {sol.icon}
                                        <Chip label={sol.tag} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700 }} />
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>
                                        {sol.category}
                                    </Typography>
                                    <Typography variant="subtitle1" fontWeight={800} sx={{ my: 0.5, fontSize: '0.95rem' }}>
                                        {sol.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.825rem', lineHeight: 1.5 }}>
                                        {sol.description}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Crude Oil Quality & Benchmark Specifications Table */}
            <Paper elevation={1} sx={{ p: 2.5, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={850} color="primary">
                            Crude Oil Grade & Quality Index
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            API gravity standards and sulfur content specs logged during custody transfers.
                        </Typography>
                    </Box>
                    <Chip label="Aptos Verified Specifications" color="info" size="small" variant="outlined" />
                </Box>

                <Grid container spacing={1.5}>
                    {CRUDE_GRADES.map((grade) => (
                        <Grid item xs={12} md={4} key={grade.grade}>
                            <Card elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', backgroundColor: 'background.default', borderRadius: 2 }}>
                                <Typography variant="subtitle2" fontWeight={800} color="primary">
                                    {grade.grade}
                                </Typography>
                                <Divider sx={{ my: 1 }} />
                                <Stack spacing={0.5}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="caption" color="text.secondary">API Gravity:</Typography>
                                        <Typography variant="caption" fontWeight={700}>{grade.api}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="caption" color="text.secondary">Sulfur Content:</Typography>
                                        <Typography variant="caption" fontWeight={700}>{grade.sulfur}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="caption" color="text.secondary">Major Regions:</Typography>
                                        <Typography variant="caption" fontWeight={700}>{grade.region}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">Refining Status:</Typography>
                                        <Chip label={grade.status} size="small" color="success" sx={{ height: 18, fontSize: '0.65rem' }} />
                                    </Box>
                                </Stack>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Paper>

            {/* Oil & Gas Daily Intelligence Newsletter Section */}
            <Paper
                elevation={0}
                sx={{
                    background: 'linear-gradient(110deg, #0F2942 0%, #173F5F 100%)',
                    color: '#ffffff',
                    borderRadius: 2,
                    p: { xs: 2.5, sm: 3.5 },
                    mb: 3,
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                }}
            >
                <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <NewsIcon sx={{ color: '#E5A93C', fontSize: 28 }} />
                            <Typography variant="h6" fontWeight={850} sx={{ color: '#ffffff' }}>
                                Daily Energy & Crude Oil Market Intelligence
                            </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.85)', mb: 2, lineHeight: 1.6 }}>
                            Subscribe to receive daily Brent/WTI benchmark price analysis, OPEC+ production quota updates, ML wellhead anomaly alerts, and Aptos blockchain telemetry reports directly to your inbox.
                        </Typography>

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                            <Chip label="✓ Daily Price Digest" size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }} />
                            <Chip label="✓ ML Anomaly Reports" size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }} />
                            <Chip label="✓ Move On-Chain Logs" size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }} />
                        </Stack>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Paper
                            elevation={3}
                            sx={{
                                p: 2.5,
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: 2,
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                            }}
                        >
                            <form onSubmit={handleNewsletterSubmit}>
                                <Stack spacing={1.5}>
                                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#ffffff' }}>
                                        Join 12,000+ Energy Professionals & Engineers
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        variant="outlined"
                                        placeholder="Enter work email (e.g. operator@energy.com)..."
                                        value={newsletterEmail}
                                        onChange={(e) => setNewsletterEmail(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <EmailIcon sx={{ color: '#ffffff', fontSize: 18 }} />
                                                </InputAdornment>
                                            ),
                                            sx: {
                                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                                color: '#ffffff',
                                                borderRadius: 1,
                                                fontSize: '0.85rem',
                                                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                                '&:hover fieldset': { borderColor: '#ffffff !important' },
                                            },
                                        }}
                                    />
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        size="medium"
                                        sx={{
                                            backgroundColor: '#E5A93C',
                                            color: '#0F2942',
                                            fontWeight: 800,
                                            '&:hover': { backgroundColor: '#d19830' },
                                            borderRadius: 1,
                                            py: 1,
                                        }}
                                    >
                                        Subscribe to Free Daily Intelligence
                                    </Button>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: '0.7rem' }}>
                                        No spam. Unsubscribe at any time with a single click.
                                    </Typography>
                                </Stack>
                            </form>
                        </Paper>
                    </Grid>
                </Grid>
            </Paper>

            {/* Energy FAQ Accordion Section */}
            <Paper elevation={1} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight={850} color="primary" sx={{ mb: 1.5 }}>
                    Oil & Gas Telemetry FAQ
                </Typography>
                <Stack spacing={1}>
                    {ENERGY_FAQS.map((faq) => (
                        <Accordion key={faq.q} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px !important', '&:before': { display: 'none' } }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="subtitle2" fontWeight={750}>{faq.q}</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 0 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                                    {faq.a}
                                </Typography>
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Stack>
            </Paper>
        </Box>
    );
};

export default Home;
