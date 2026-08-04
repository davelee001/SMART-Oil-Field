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
    { name: 'Brent Crude', symbol: 'BRENT', price: '$78.42', unit: '/bbl', change: '+1.35%', positive: true },
    { name: 'WTI Crude', symbol: 'WTI', price: '$74.18', unit: '/bbl', change: '+0.92%', positive: true },
    { name: 'Natural Gas', symbol: 'NG', price: '$2.15', unit: '/MMBtu', change: '-0.46%', positive: false },
    { name: 'OPEC Basket', symbol: 'OPEC', price: '$81.10', unit: '/bbl', change: '+1.10%', positive: true },
    { name: 'Gasoline RBOB', symbol: 'RBOB', price: '$2.38', unit: '/gal', change: '+0.75%', positive: true },
    { name: 'Heating Oil', symbol: 'HO', price: '$2.49', unit: '/gal', change: '-0.12%', positive: false },
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
                                    p: 1,
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
                                    <Typography variant="body2" fontWeight={800} sx={{ color: '#ffffff', fontSize: '0.9rem' }}>
                                        {item.price}
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)' }}>
                                        {item.unit}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mt: 0.2 }}>
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
badge: 'Most Popular',
    },
{
    name: 'Enterprise Field',
        price: '8 APT',
            period: '/ month',
                description: 'Full custom deployment for major producers and regional fleets.',
                    features: ['Unlimited Oil Wells', 'Sub-second Data Feeds', 'Dedicated On-Chain Move Module', 'Custom ML Models', '24/7 Dedicated SLA'],
                        highlighted: false,
    },
];

const FAQS = [
    {
        q: 'What is SMART Oil Field?',
        a: 'SMART Oil Field is an end-to-end industrial IoT platform combining real-time telemetry, AI predictive maintenance, and Aptos blockchain tracking to give field operators total visibility and auditability over oil production.',
    },
    {
        q: 'How does Aptos blockchain fit into oil field management?',
        a: 'We use Aptos Move smart contracts to publish immutable oil movement certificates, record equipment custody changes, and process subscription payments transparently without centralized intermediaries.',
    },
    {
        q: 'Can I test the platform before committing APT tokens?',
        a: 'Yes! The public dashboard and interactive demo run on Aptos Testnet, allowing you to simulate subscription flows and explore live field data for free.',
    },
    {
        q: 'What data export formats are supported?',
        a: 'You can export filtered well telemetry reports in both PDF (with customized layouts) and Excel (.xlsx) formats directly from the dashboard.',
    },
    {
        q: 'How do I integrate my existing SCADA / IoT hardware?',
        a: 'Our Python and TypeScript backend APIs expose open REST, GraphQL, and WebSocket ingestion endpoints compatible with standard SCADA MQTT/Modbus bridges.',
    },
];

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [contactEmail, setContactEmail] = useState('');

    const handleNewsletterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!contactEmail.trim() || !contactEmail.includes('@')) {
            toast.error('Please enter a valid email address.');
            return;
        }
        toast.success('Thank you! Early access details sent.');
        setContactEmail('');
    };

    return (
        <Box sx={{ width: '100%', minWidth: 0, px: { xs: 2, sm: 3, md: 4 }, py: 2 }}>
            {/* Hero Section */}
            <Paper
                elevation={0}
                sx={{
                    background: 'linear-gradient(125deg, #0F2942 0%, #173F5F 58%, #1A5563 100%)',
                    color: '#ffffff',
                    borderRadius: 2,
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    p: { xs: 2, sm: 3 },
                    mb: 2,
                }}
            >
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={7}>
                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                            <Chip
                                icon={<SparklesIcon sx={{ color: '#ffd700 !important', fontSize: 16 }} />}
                                label="Next-Gen Energy Tech • Aptos Powered"
                                size="small"
                                sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                    color: '#ffffff',
                                    fontWeight: 600,
                                    mb: 1,
                                }}
                            />
                            <Typography
                                variant="h4"
                                component="h1"
                                sx={{
                                    fontWeight: 800,
                                    fontSize: { xs: '1.5rem', sm: '2rem', md: '2.3rem' },
                                    lineHeight: 1.25,
                                    mb: 1,
                                }}
                            >
                                Real-Time Telemetry meets <span style={{ color: '#73C7E8' }}>Blockchain Trust</span>
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: 'rgba(255, 255, 255, 0.85)',
                                    mb: 2,
                                    fontSize: '0.9rem',
                                }}
                            >
                                Monitor oil wells, automate predictive maintenance with AI, and verify movement provenance on Aptos Move smart contracts.
                            </Typography>

                            <Stack direction="row" spacing={1.5}>
                                <Button
                                    variant="contained"
                                    size="medium"
                                    component={Link}
                                    to="/dashboard"
                                    endIcon={<ArrowForwardIcon />}
                                    sx={{
                                        backgroundColor: '#236A8D',
                                        '&:hover': { backgroundColor: '#1B5572' },
                                        fontWeight: 700,
                                        borderRadius: 1.5,
                                        px: 2.5,
                                    }}
                                >
                                    Dashboard
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="medium"
                                    component={Link}
                                    to="/subscriptions"
                                    startIcon={<DemoIcon />}
                                    sx={{
                                        color: '#ffffff',
                                        borderColor: 'rgba(255, 255, 255, 0.5)',
                                        '&:hover': {
                                            borderColor: '#ffffff',
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        },
                                        fontWeight: 600,
                                        borderRadius: 1.5,
                                        px: 2,
                                    }}
                                >
                                    Pricing
                                </Button>
                            </Stack>
                        </motion.div>
                    </Grid>

                    <Grid item xs={12} md={5}>
                        <Paper
                            elevation={4}
                            sx={{
                                p: 2,
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: 2,
                                color: '#ffffff',
                            }}
                        >
                            <Typography variant="caption" sx={{ opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                                Live Operations Snapshot
                            </Typography>
                            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.2)', my: 1 }} />

                            <Grid container spacing={1}>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="rgba(255,255,255,0.7)">Active Wells</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                                        <Chip label="5 / 6 Active" color="success" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                                    </Box>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="rgba(255,255,255,0.7)">Total Production</Typography>
                                    <Typography variant="body2" fontWeight={700}>8,770 bbl/d</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="rgba(255,255,255,0.7)">Aptos Network</Typography>
                                    <Box sx={{ mt: 0.3 }}>
                                        <Chip label="Testnet Synced" color="info" size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                                    </Box>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="caption" color="rgba(255,255,255,0.7)">AI Health Score</Typography>
                                    <Typography variant="body2" fontWeight={700} color="#81c784">98.4% Normal</Typography>
                                </Grid>
                            </Grid>

                            <Button
                                fullWidth
                                variant="contained"
                                size="small"
                                onClick={() => navigate('/dashboard')}
                                sx={{ mt: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.2)', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' }, textTransform: 'none', py: 0.5 }}
                            >
                                Open Live Well Details Table
                            </Button>
                        </Paper>
                    </Grid>
                </Grid>
            </Paper>

            {/* Key Metrics Row */}
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
                {METRICS.map((metric) => (
                    <Grid item xs={6} sm={3} key={metric.label}>
                        <Paper
                            elevation={1}
                            sx={{
                                p: 1.5,
                                textAlign: 'center',
                                borderRadius: 1.5,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderTop: '3px solid #173F5F',
                            }}
                        >
                            <Typography variant="h6" color="primary" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                                {metric.value}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {metric.label}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Core Features Grid */}
            <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1, textAlign: 'center', color: 'primary.main' }}>
                    Core Capabilities
                </Typography>
                <Grid container spacing={1.5}>
                    {FEATURES.map((feat) => (
                        <Grid item xs={12} sm={6} md={4} key={feat.title}>
                            <Card
                                elevation={1}
                                sx={{
                                    height: '100%',
                                    borderRadius: 1.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                }}
                            >
                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                        {feat.icon}
                                        <Chip label={feat.chip} size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                                    </Box>
                                    <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.85rem' }}>
                                        {feat.title}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3, lineHeight: 1.3 }}>
                                        {feat.description}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Compact Architecture + Pricing split section */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
                {/* Architecture Column */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={1} sx={{ p: 2, borderRadius: 2, height: '100%', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle1" fontWeight={800} color="primary" gutterBottom>
                            System Architecture
                        </Typography>
                        <Stack spacing={1} sx={{ mb: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CheckIcon color="success" sx={{ fontSize: 18 }} />
                                <Typography variant="caption" fontWeight={600}>REST, GraphQL & WebSocket Gateway</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CheckIcon color="success" sx={{ fontSize: 18 }} />
                                <Typography variant="caption" fontWeight={600}>Move Smart Contracts on Aptos Blockchain</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CheckIcon color="success" sx={{ fontSize: 18 }} />
                                <Typography variant="caption" fontWeight={600}>Scikit-Learn ML Anomaly Pipelines</Typography>
                            </Box>
                        </Stack>

                        <Paper
                            elevation={0}
                            sx={{
                                p: 1.5,
                                borderRadius: 1.5,
                                backgroundColor: '#102A3A',
                                color: '#ffffff',
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                lineHeight: 1.6,
                            }}
                        >
                            <Typography component="div" color="#81c784">[Frontend] React 18 • TypeScript • MUI 5</Typography>
                            <Typography component="div" color="#64b5f6">[Gateway] Python FastAPI • TS • Redis • RabbitMQ</Typography>
                            <Typography component="div" color="#ffd54f">[Move Chain] `oil_tracker` & `subscriptions`</Typography>
                        </Paper>
                    </Paper>
                </Grid>

                {/* Pricing Column */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={1} sx={{ p: 2, borderRadius: 2, height: '100%', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle1" fontWeight={800} color="primary" gutterBottom>
                            Plans & Subscriptions
                        </Typography>
                        <Grid container spacing={1}>
                            {PLANS.map((plan) => (
                                <Grid item xs={4} key={plan.name}>
                                    <Card
                                        elevation={0}
                                        sx={{
                                            p: 1,
                                            border: '1px solid',
                                            borderColor: plan.highlighted ? 'primary.main' : 'divider',
                                            borderRadius: 1.5,
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justify: 'space-between',
                                            textAlign: 'center',
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="caption" fontWeight={700} sx={{ display: 'block', fontSize: '0.75rem' }}>
                                                {plan.name}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={800} color="primary" sx={{ my: 0.5 }}>
                                                {plan.price}
                                            </Typography>
                                        </Box>
                                        <Button
                                            size="small"
                                            variant={plan.highlighted ? 'contained' : 'outlined'}
                                            component={Link}
                                            to="/subscriptions"
                                            sx={{ fontSize: '0.65rem', py: 0.2, minWidth: 0 }}
                                        >
                                            Select
                                        </Button>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                        <Button
                            fullWidth
                            variant="text"
                            size="small"
                            component={Link}
                            to="/subscriptions"
                            endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                            sx={{ mt: 1.5, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }}
                        >
                            Compare full plan perks & redeem discount codes
                        </Button>
                    </Paper>
                </Grid>
            </Grid>

            {/* FAQ Accordion & Newsletter row */}
            <Grid container spacing={2}>
                <Grid item xs={12} md={7}>
                    <Paper elevation={1} sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle2" fontWeight={800} color="primary" sx={{ mb: 1 }}>
                            Frequently Asked Questions
                        </Typography>
                        <Stack spacing={0.5}>
                            {FAQS.map((faq) => (
                                <Accordion key={faq.q} elevation={0} sx={{ border: '1px solid #eee', '&:before': { display: 'none' } }}>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />} sx={{ minHeight: 36, py: 0 }}>
                                        <Typography variant="caption" fontWeight={700}>{faq.q}</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails sx={{ py: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">{faq.a}</Typography>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Stack>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={5}>
                    <Paper
                        elevation={0}
                        sx={{
                            backgroundColor: '#173F5F',
                            color: '#ffffff',
                            borderRadius: 2,
                            p: 2,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justify: 'center',
                        }}
                    >
                        <Typography variant="subtitle2" fontWeight={800} gutterBottom>
                            Stay Updated
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.85, mb: 1.5, display: 'block' }}>
                            Get updates on new Move smart contract deployments and ML anomaly models.
                        </Typography>

                        <form onSubmit={handleNewsletterSubmit}>
                            <Stack spacing={1}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    variant="outlined"
                                    placeholder="Enter work email..."
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <EmailIcon sx={{ color: '#ffffff', fontSize: 16 }} />
                                            </InputAdornment>
                                        ),
                                        sx: {
                                            backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                            color: '#ffffff',
                                            borderRadius: 1,
                                            fontSize: '0.8rem',
                                            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                        },
                                    }}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="small"
                                    sx={{
                                        backgroundColor: '#ffffff',
                                        color: '#173F5F',
                                        fontWeight: 700,
                                        '&:hover': { backgroundColor: '#f0f0f0' },
                                        borderRadius: 1,
                                    }}
                                >
                                    Subscribe
                                </Button>
                            </Stack>
                        </form>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Home;
