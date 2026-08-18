import React, { useState, useEffect, useRef } from 'react';
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
    keyframes,
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

const ledPulse = keyframes`
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.45; transform: scale(0.8); }
`;

const flowScroll = keyframes`
    from { background-position: 0 0; }
    to { background-position: 32px 0; }
`;

interface MarketPrice {
    name: string;
    symbol: string;
    price: string;
    unit: string;
    change: string;
    positive: boolean;
    high: string;
    low: string;
    volume: string;
}

// Real-time Global Energy Commodities Ticker Data
const MARKET_PRICES: MarketPrice[] = [
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

const INITIAL_MARKET_PRICES = MARKET_PRICES;

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [newsletterEmail, setNewsletterEmail] = useState('');
    const [prices, setMarketPrices] = useState(INITIAL_MARKET_PRICES);

    // SCADA Live Metrics state
    const [scadaMetrics, setScadaMetrics] = useState({
        flow: 4812,
        pressure: 204.8,
        temp: 74.2,
        blockNum: 84920,
        status: 'ONLINE'
    });

    // Console logs simulator state
    const [scadaLogs, setScadaLogs] = useState<Array<{ id: number; time: string; msg: string; type: 'success' | 'info' | 'warning' | 'error' }>>([
        { id: 1, time: '11:24:02 AM', msg: 'SCADA telemetry pipeline monitoring node initialized...', type: 'success' },
        { id: 2, time: '11:24:05 AM', msg: 'Aptos Web3 RPC subscription validator online.', type: 'success' },
        { id: 3, time: '11:24:08 AM', msg: 'Operational rules active: March, August, October defined as peak seasonal discount windows.', type: 'info' },
    ]);

    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logs terminal
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [scadaLogs]);

    // Live fluctuate and ticks simulation loop
    useEffect(() => {
        const liveLoop = setInterval(() => {
            setScadaMetrics(prev => {
                const flowDelta = Math.floor(Math.random() * 14 - 7);
                const pressDelta = parseFloat((Math.random() * 1.8 - 0.9).toFixed(1));
                const tempDelta = parseFloat((Math.random() * 0.4 - 0.2).toFixed(1));

                const nextPress = parseFloat((prev.pressure + pressDelta).toFixed(1));
                const isFluctuating = nextPress > 206.5 || nextPress < 203.2;

                return {
                    flow: prev.flow + flowDelta,
                    pressure: nextPress,
                    temp: parseFloat((prev.temp + tempDelta).toFixed(1)),
                    blockNum: prev.blockNum + (Math.random() > 0.45 ? 1 : 0),
                    status: isFluctuating ? 'FLUCTUATING' : 'ONLINE'
                };
            });

            // Fluctuate global energy commodities slightly
            setMarketPrices(prev => prev.map(item => {
                const changePct = parseFloat((Math.random() * 0.3 - 0.15).toFixed(2));
                const rawPrice = parseFloat(item.price.replace(/[$,]/g, ''));
                const nextPrice = rawPrice * (1 + changePct / 100);
                const formatted = '$' + nextPrice.toFixed(2);

                return {
                    ...item,
                    price: formatted,
                    change: (changePct >= 0 ? '+' : '') + changePct.toFixed(2) + '%',
                    positive: changePct >= 0
                };
            }));
        }, 3500);

        return () => clearInterval(liveLoop);
    }, []);

    // Simulated log feed loop
    useEffect(() => {
        const logTimer = setInterval(() => {
            const timeStr = new Date().toLocaleTimeString();
            const phrases = [
                { msg: `Sub-second IoT ingest: well-001 reporting ${scadaMetrics.flow} bbl/d, pressure nominal.`, type: 'info' },
                { msg: `Batch provenance published: sulfur content ${(0.22 + Math.random() * 0.1).toFixed(3)}% uploaded to Aptos blockchain.`, type: 'success' },
                { msg: `Predictive maintenance anomaly classifier scored 0.04 (HSE bounds: SAFE).`, type: 'success' },
                { msg: `Aptos Node verified: Block #${scadaMetrics.blockNum} state synchronized seamlessly.`, type: 'success' },
                { msg: `Referral affiliate checking invoked: Operator referral logs completed on-chain.`, type: 'info' },
                { msg: `Refinery check: ESP vibration logs mapped to pipeline storage aggregates.`, type: 'info' }
            ];

            // Randomly pick a log phrase
            const selected = phrases[Math.floor(Math.random() * phrases.length)];
            setScadaLogs(prev => [
                ...prev.slice(-15), // keep last 15
                { id: Date.now(), time: timeStr, msg: selected.msg, type: selected.type as any }
            ]);
        }, 5000);

        return () => clearInterval(logTimer);
    }, [scadaMetrics]);

    const handleNewsletterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newsletterEmail.trim() || !newsletterEmail.includes('@')) {
            toast.error('Please enter a valid business email address.');
            return;
        }
        toast.success(`Subscribed! Daily Petroleum Operations Digest routed to ${newsletterEmail}`);
        setNewsletterEmail('');
    };

    return (
        <Box
            sx={{
                width: '100%',
                minWidth: 0,
                px: { xs: 1.5, sm: 2.5, md: 4 },
                py: 2.5,
                color: (theme) => theme.palette.mode === 'dark' ? '#eef4f7' : '#172b3a',
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#070a10' : '#e7ecef',
                '& .MuiTypography-colorTextSecondary': {
                    color: (theme) => theme.palette.mode === 'dark' ? '#aebbc5' : '#5b6b78',
                },
            }}
        >
            {/* Live Oil & Energy Market Commodities Bar */}
            <Paper
                elevation={0}
                sx={{
                    mb: 3,
                    p: 2,
                    borderRadius: 3,
                    background: (theme) =>
                        theme.palette.mode === 'dark'
                            ? 'linear-gradient(135deg, #080d18 0%, #0d1528 100%)'
                            : 'linear-gradient(135deg, #14283a 0%, #1d3b52 100%)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <OilIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                        <Typography variant="subtitle2" fontWeight={850} sx={{ textTransform: 'uppercase', fontSize: '0.78rem', color: '#f59e0b', overflowWrap: 'anywhere' }}>
                            SCADA Live Global Crude & Energy Benchmark Markets
                        </Typography>
                    </Box>
                    <Chip
                        role="status"
                        icon={<SparklesIcon sx={{ color: '#10b981 !important', fontSize: 13 }} />}
                        label="Markets Feed Live • 3s SCADA Polling"
                        size="small"
                        sx={{
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            color: '#ffffff',
                            fontWeight: 700,
                            height: 22,
                            fontSize: '0.68rem',
                        }}
                    />
                </Box>

                <Grid container spacing={1.5}>
                    {prices.map((item) => (
                        <Grid item xs={6} sm={4} md={2} key={item.symbol}>
                            <Box
                                sx={{
                                    p: 1.5,
                                    borderRadius: 2,
                                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                        borderColor: 'rgba(245, 158, 11, 0.2)',
                                    },
                                }}
                            >
                                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700, display: 'block', fontSize: '0.68rem', letterSpacing: 0.3 }}>
                                    {item.name}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 0.3 }}>
                                    <Typography variant="body2" fontWeight={900} sx={{ color: '#ffffff', fontSize: '1rem', fontFamily: 'JetBrains Mono, monospace' }}>
                                        {item.price}
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                                        {item.unit}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                        {item.positive ? (
                                            <TrendingUpIcon sx={{ fontSize: 13, color: '#10b981' }} />
                                        ) : (
                                            <TrendingDownIcon sx={{ fontSize: 13, color: '#ef4444' }} />
                                        )}
                                        <Typography
                                            variant="caption"
                                            fontWeight={800}
                                            sx={{ fontSize: '0.68rem', color: item.positive ? '#10b981' : '#ef4444' }}
                                        >
                                            {item.change}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            </Paper>

            {/* Industrial SCADA Top Landing Bar / Header */}
            <Paper
                elevation={0}
                sx={{
                    mb: 3,
                    p: { xs: 2, sm: 3 },
                    borderRadius: 3,
                    background: (theme) => theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, #0b0f18 0%, #070a10 100%)'
                        : '#f7f9fa',
                    border: '1px solid',
                    borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#cbd5dc',
                    borderLeft: '5px solid #f59e0b',
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: { xs: 'flex-start', md: 'center' },
                    justifyContent: 'space-between',
                    gap: 3,
                    boxShadow: '0 15px 35px -15px rgba(0,0,0,0.1)'
                }}
            >
                <Box>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                        <Avatar sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', width: 44, height: 44 }}>
                            <RigIcon sx={{ fontSize: 24 }} />
                        </Avatar>
                        <Box sx={{ textAlign: 'left' }}>
                            <Typography variant="h5" fontWeight={900} sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#f8fafc' : '#172b3a', fontFamily: 'Montserrat, sans-serif' }}>
                                SMART <span style={{ color: '#f59e0b' }}>OIL FIELD</span>
                            </Typography>
                            <Typography variant="caption" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#9fb0bd' : '#687985', display: 'flex', alignItems: 'center', gap: 0.5 }} className="font-mono">
                                SCADA OPERATIONS CONTROL DECK • v1.2.0
                            </Typography>
                        </Box>
                    </Stack>
                    <Typography variant="body2" sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#aebbc5' : '#50616d', maxWidth: 650, fontSize: '0.85rem', textAlign: 'left' }}>
                        IoT telemetry streaming and blockchain-backed subscription management compiled with Python FastAPI servers, TypeScript middleware gateways, and Aptos Move smart contracts.
                    </Typography>
                </Box>

                {/* Real-time system diagnostics KPIs */}
                <Box sx={{ alignSelf: { xs: 'stretch', md: 'auto' }, display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' }, gap: 1 }}>
                    <Box sx={{ px: 2, py: 1, bgcolor: 'rgba(10, 15, 29, 0.25)', borderRadius: 2, border: '1px solid', borderColor: 'divider', minWidth: 0, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.62rem', fontWeight: 800 }}>LIVE FLOW</Typography>
                        <Typography variant="subtitle2" fontWeight={850} color="#06b6d4" className="font-mono">{scadaMetrics.flow.toLocaleString()} bbl/d</Typography>
                    </Box>
                    <Box sx={{ px: 2, py: 1, bgcolor: 'rgba(10, 15, 29, 0.25)', borderRadius: 2, border: '1px solid', borderColor: 'divider', minWidth: 0, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.62rem', fontWeight: 800 }}>LINE PRESS</Typography>
                        <Typography variant="subtitle2" fontWeight={850} color="#06b6d4" className="font-mono">{scadaMetrics.pressure} PSI</Typography>
                    </Box>
                    <Box sx={{ px: 2, py: 1, bgcolor: 'rgba(10, 15, 29, 0.25)', borderRadius: 2, border: '1px solid', borderColor: 'divider', minWidth: 0, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.62rem', fontWeight: 800 }}>WELL TEMP</Typography>
                        <Typography variant="subtitle2" fontWeight={850} color="#06b6d4" className="font-mono">{scadaMetrics.temp} °F</Typography>
                    </Box>
                    <Box sx={{ px: 2, py: 1, bgcolor: 'rgba(10, 15, 29, 0.25)', borderRadius: 2, border: '1px solid', borderColor: 'divider', minWidth: 0, textAlign: 'center', position: 'relative' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.62rem', fontWeight: 800 }}>APTOS MOVE</Typography>
                        <Typography variant="subtitle2" fontWeight={850} color="#f59e0b" className="font-mono" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <Box component="span" sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#10b981', display: 'inline-block', animation: `${ledPulse} 1s infinite` }} />
                            #{scadaMetrics.blockNum}
                        </Typography>
                    </Box>
                </Box>
            </Paper>

            {/* SPECIAL REFNERY DISCOUNT PROMPT */}
            <Paper
                elevation={0}
                sx={{
                    mb: 3,
                    p: 2.5,
                    borderRadius: 3,
                    background: (theme) => theme.palette.mode === 'dark' ? '#18150f' : '#f5eddd',
                    border: '1px dashed rgba(245, 158, 11, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 2
                }}
            >
                <Box sx={{ textAlign: 'left' }}>
                    <Chip label="REFINERY PROMOTIONS" size="small" sx={{ bgcolor: '#f59e0b', color: '#000', fontWeight: 900, mb: 1, height: 20, fontSize: '0.65rem' }} />
                    <Typography variant="subtitle1" fontWeight={900} sx={{ color: (theme) => theme.palette.mode === 'dark' ? '#fef08a' : '#65430b', fontSize: '1.05rem', mb: 0.2 }}>
                        🔥 High-Season Discount Active: Receive 30% OFF Plan Subscriptions!
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.78rem' }}>
                        Valid in March, August, and October on Aptos subscription renewals. Returning loyal users get an automatic 15% discount.
                    </Typography>
                </Box>
                <Button variant="contained" component={Link} to="/subscriptions" sx={{ bgcolor: '#f59e0b', color: '#000', fontWeight: 800, '&:hover': { bgcolor: '#d19830' } }}>
                    Deploy Web3 Access
                </Button>
            </Paper>

            {/* INTERACTIVE SCADA DRILLING-TO-REFINERY PIPELINE STREAM */}
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    mb: 3,
                    borderRadius: 3,
                    background: (theme) => theme.palette.mode === 'dark' ? '#0a0e16' : '#f7f9fa',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 8px 24px -10px rgba(0,0,0,0.1)'
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#06b6d4', boxShadow: '0 0 8px #06b6d4' }} />
                        <Typography variant="subtitle2" fontWeight={800} color="text.primary" sx={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>
                            IoT-to-Chain Real-Time Pipeline Stream
                        </Typography>
                    </Box>
                    <Chip
                        label="SCADA STREAM LIVE"
                        size="small"
                        sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            bgcolor: 'rgba(6, 182, 212, 0.08)',
                            color: '#06b6d4',
                            border: '1px solid rgba(6, 182, 212, 0.2)',
                            fontWeight: 800
                        }}
                    />
                </Box>

                <Grid container spacing={2} alignItems="center">
                    {/* Node 1: Wellhead */}
                    <Grid item xs={12} sm={5} md={2.4}>
                        <Paper sx={{ p: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(10, 15, 29, 0.6)' : '#f8fafc', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ fontSize: '1.5rem', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', width: 32, height: 32, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔌</Box>
                            <Box sx={{ textAlign: 'left' }}>
                                <Typography variant="caption" fontWeight={800} color="text.primary" sx={{ display: 'block', lineHeight: 1.2 }}>Wellhead IoT Node</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.68rem', fontFamily: 'monospace' }}>well-001</Typography>
                                <Chip label={scadaMetrics.status} size="small" color={scadaMetrics.status === 'ONLINE' ? 'success' : 'warning'} sx={{ height: 16, fontSize: '0.58rem', fontWeight: 800, mt: 0.3 }} />
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Pipe Connector 1 */}
                    <Grid item xs={12} sm={1} md={0.8} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Box sx={{ width: '100%', height: 4, bgcolor: 'divider', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                            <Box sx={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '150%', background: 'linear-gradient(90deg, transparent, #06b6d4, transparent)', animation: `${flowScroll} 1.5s linear infinite` }} />
                        </Box>
                    </Grid>

                    {/* Node 2: FastAPI Broker */}
                    <Grid item xs={12} sm={5} md={2.4}>
                        <Paper sx={{ p: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(10, 15, 29, 0.6)' : '#f8fafc', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ fontSize: '1.5rem', bgcolor: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', width: 32, height: 32, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚡</Box>
                            <Box sx={{ textAlign: 'left' }}>
                                <Typography variant="caption" fontWeight={800} color="text.primary" sx={{ display: 'block', lineHeight: 1.2 }}>FastAPI Ingestion</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.68rem', fontFamily: 'monospace' }}>Port 8000</Typography>
                                <Chip label="BROKER LISTENING" size="small" sx={{ height: 16, fontSize: '0.58rem', bgcolor: 'rgba(6,182,212,0.1)', color: '#06b6d4', fontWeight: 800, mt: 0.3 }} />
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Pipe Connector 2 */}
                    <Grid item xs={12} sm={1} md={0.8} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Box sx={{ width: '100%', height: 4, bgcolor: 'divider', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                            <Box sx={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '150%', background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)', animation: `${flowScroll} 1.5s linear infinite` }} />
                        </Box>
                    </Grid>

                    {/* Node 3: TS Gateway */}
                    <Grid item xs={12} sm={5} md={2.4}>
                        <Paper sx={{ p: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(10, 15, 29, 0.6)' : '#f8fafc', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ fontSize: '1.5rem', bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', width: 32, height: 32, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🟢</Box>
                            <Box sx={{ textAlign: 'left' }}>
                                <Typography variant="caption" fontWeight={800} color="text.primary" sx={{ display: 'block', lineHeight: 1.2 }}>TS Express Gateway</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.68rem', fontFamily: 'monospace' }}>Port 3000</Typography>
                                <Chip label="PROXY ACTIVE" size="small" sx={{ height: 16, fontSize: '0.58rem', bgcolor: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontWeight: 800, mt: 0.3 }} />
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Pipe Connector 3 */}
                    <Grid item xs={12} sm={1} md={0.8} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Box sx={{ width: '100%', height: 4, bgcolor: 'divider', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                            <Box sx={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '150%', background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)', animation: `${flowScroll} 1.5s linear infinite` }} />
                        </Box>
                    </Grid>

                    {/* Node 4: Move Contract */}
                    <Grid item xs={12} sm={5} md={2.4}>
                        <Paper sx={{ p: 2, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(10, 15, 29, 0.6)' : '#f8fafc', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ fontSize: '1.5rem', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', width: 32, height: 32, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⛓️</Box>
                            <Box sx={{ textAlign: 'left' }}>
                                <Typography variant="caption" fontWeight={800} color="text.primary" sx={{ display: 'block', lineHeight: 1.2 }}>Move Smart Contract</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.68rem', fontFamily: 'monospace' }}>Aptos Modules</Typography>
                                <Chip label="APT DECIMALS SYNCED" size="small" sx={{ height: 16, fontSize: '0.58rem', bgcolor: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontWeight: 800, mt: 0.3 }} />
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Paper>

            {/* Hero Banner Area */}
            <Paper
                elevation={0}
                sx={{
                    background: 'linear-gradient(135deg, #090e1a 0%, #15243f 100%)',
                    color: '#ffffff',
                    borderRadius: 4,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    p: { xs: 3, sm: 4, md: 5 },
                    mb: 3,
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -15px rgba(0, 0, 0, 0.35)'
                }}
            >
                <Grid container spacing={4} alignItems="center">
                    <Grid item xs={12} md={7}>
                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                            <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                                <Chip
                                    icon={<RigIcon sx={{ color: '#f59e0b !important', fontSize: 13 }} />}
                                    label="Digital Oilfield SCADA"
                                    size="small"
                                    sx={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#ffffff', border: '1px solid rgba(245,158,11,0.25)', fontWeight: 700 }}
                                />
                                <Chip
                                    icon={<ShieldIcon sx={{ color: '#06b6d4 !important', fontSize: 13 }} />}
                                    label="Aptos Move On-Chain Trust"
                                    size="small"
                                    sx={{ backgroundColor: 'rgba(6, 182, 212, 0.12)', color: '#ffffff', border: '1px solid rgba(6,182,212,0.25)', fontWeight: 700 }}
                                />
                            </Stack>

                            <Typography
                                variant="h3"
                                component="h1"
                                sx={{
                                    fontWeight: 900,
                                    fontSize: { xs: '1.8rem', sm: '2.4rem', md: '3rem' },
                                    lineHeight: 1.15,
                                    mb: 2,
                                    fontFamily: 'Montserrat, sans-serif',
                                    textAlign: 'left'
                                }}
                            >
                                Next-Gen <span style={{ color: '#f59e0b' }}>Oil & Gas</span> Telemetry, AI Analytics & On-Chain Billing
                            </Typography>

                            <Typography
                                variant="body1"
                                sx={{
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    mb: 4,
                                    fontSize: '0.98rem',
                                    lineHeight: 1.6,
                                    textAlign: 'left'
                                }}
                            >
                                SMART Oil Field empowers energy operators, pipeline engineers, and refinery controllers with sub-second SCADA wellhead monitoring, AI pump anomaly forecasting, and cryptographically verified crude oil custody logs on Aptos Move.
                            </Typography>

                            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                                <Button
                                    variant="contained"
                                    size="large"
                                    component={Link}
                                    to="/dashboard"
                                    endIcon={<ArrowForwardIcon />}
                                    sx={{
                                        backgroundColor: '#f59e0b',
                                        color: '#090e1a',
                                        '&:hover': { backgroundColor: '#d19830' },
                                        fontWeight: 800,
                                        borderRadius: 2,
                                        px: 3.5,
                                        py: 1.25,
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
                                        borderColor: 'rgba(255, 255, 255, 0.25)',
                                        '&:hover': {
                                            borderColor: '#ffffff',
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        },
                                        fontWeight: 700,
                                        borderRadius: 2,
                                        px: 3,
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
                            elevation={12}
                            sx={{
                                p: 3,
                                backgroundColor: 'rgba(5, 7, 15, 0.85)',
                                backdropFilter: 'blur(16px)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: 3,
                                color: '#ffffff',
                                boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.65)'
                            }}
                        >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                <Typography variant="caption" sx={{ color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981', display: 'inline-block', animation: `${ledPulse} 1s infinite` }} />
                                    REAL-TIME FIELD TELEMETRY DECK
                                </Typography>
                                <Chip label="SCADA LIVE" color="success" size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 800, borderRadius: 1 }} />
                            </Box>
                            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', mb: 2.5 }} />

                            <Grid container spacing={2}>
                                <Grid item xs={6} sx={{ textAlign: 'left' }}>
                                    <Typography variant="caption" color="rgba(255,255,255,0.5)">Active Monitored Wells</Typography>
                                    <Typography variant="body1" fontWeight={900} color="#06b6d4" className="font-mono">1,420 Active</Typography>
                                </Grid>
                                <Grid item xs={6} sx={{ textAlign: 'left' }}>
                                    <Typography variant="caption" color="rgba(255,255,255,0.5)">Gross Daily Rate</Typography>
                                    <Typography variant="body1" fontWeight={900} className="font-mono">{scadaMetrics.flow.toLocaleString()} bbl/d</Typography>
                                </Grid>
                                <Grid item xs={6} sx={{ textAlign: 'left' }}>
                                    <Typography variant="caption" color="rgba(255,255,255,0.5)">Pipeline Pressure</Typography>
                                    <Typography variant="body1" fontWeight={900} className="font-mono">{scadaMetrics.pressure} PSI</Typography>
                                </Grid>
                                <Grid item xs={6} sx={{ textAlign: 'left' }}>
                                    <Typography variant="caption" color="rgba(255,255,255,0.5)">Wellhead Fluid Temp</Typography>
                                    <Typography variant="body1" fontWeight={900} className="font-mono">{scadaMetrics.temp} °F</Typography>
                                </Grid>
                                <Grid item xs={6} sx={{ textAlign: 'left' }}>
                                    <Typography variant="caption" color="rgba(255,255,255,0.5)">Water Cut Ratio</Typography>
                                    <Typography variant="caption" fontWeight={800} color="#10b981" sx={{ display: 'block', mt: 0.3, fontSize: '0.82rem' }}>12.4% (Optimal)</Typography>
                                </Grid>
                                <Grid item xs={6} sx={{ textAlign: 'left' }}>
                                    <Typography variant="caption" color="rgba(255,255,255,0.5)">Aptos Move Chain</Typography>
                                    <Typography variant="caption" fontWeight={800} color="#3b82f6" sx={{ display: 'block', mt: 0.3, fontSize: '0.82rem' }} className="font-mono">Block #{scadaMetrics.blockNum}</Typography>
                                </Grid>
                            </Grid>

                            <Button
                                fullWidth
                                variant="contained"
                                size="medium"
                                onClick={() => navigate('/dashboard')}
                                sx={{
                                    mt: 3,
                                    backgroundColor: '#f59e0b',
                                    color: '#090e1a',
                                    fontWeight: 800,
                                    height: 38,
                                    '&:hover': { backgroundColor: '#d19830' },
                                    textTransform: 'none',
                                    borderRadius: 1.5
                                }}
                            >
                                Open Full Telemetry Dashboard & Maps
                            </Button>
                        </Paper>
                    </Grid>
                </Grid>
            </Paper>

            {/* MOCK RETRO SCADA MONITOR LOG TERMINAL */}
            <Paper
                elevation={0}
                sx={{
                    mb: 4,
                    p: 0,
                    borderRadius: 3,
                    bgcolor: '#040710',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    overflow: 'hidden',
                    boxShadow: '0 12px 28px -10px rgba(0,0,0,0.5)'
                }}
            >
                {/* Console header */}
                <Box sx={{ px: 2.22, py: 1.1, bgcolor: '#0b0f1d', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={0.8} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }} />
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.68rem', pl: 1, letterSpacing: 0.5, fontFamily: 'monospace' }}>
                            SCADA_NET_MONITOR_NODE ~/telemetry_feed
                        </Typography>
                    </Stack>
                    <Box component="span" sx={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 900, animation: `${ledPulse} 1s infinite` }}>
                        ▮
                    </Box>
                </Box>
                {/* Lines box */}
                <Box
                    sx={{
                        p: 2,
                        height: 160,
                        overflowY: 'auto',
                        fontFamily: 'JetBrains Mono, Courier New, monospace',
                        fontSize: '0.72rem',
                        lineHeight: 1.6,
                        color: 'rgba(255,255,255,0.7)',
                    }}
                >
                    {scadaLogs.map((log) => (
                        <Box key={log.id} sx={{ mb: 0.5, display: 'flex', gap: 1 }}>
                            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 700 }}>[{log.time}]</Box>
                            <Box component="span" sx={{
                                color: log.type === 'success' ? '#10b981' : log.type === 'warning' ? '#f59e0b' : log.type === 'error' ? '#ef4444' : '#06b6d4',
                                fontWeight: 800,
                            }}>
                                [{log.type.toUpperCase()}]
                            </Box>
                            <Box component="span" sx={{ textAlign: 'left' }}>{log.msg}</Box>
                        </Box>
                    ))}
                    <div ref={logsEndRef} />
                </Box>
            </Paper>

            {/* WEB3 ENTERPRISE ACCESS PLANS (PRICING TIERS) */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography variant="h5" fontWeight={900} color="primary" sx={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Web3 Refinery & Operator Licensing Plans
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Fully decentralized on-chain subscription models with automated loyalty stacked benefits & 5-day grace periods.
                    </Typography>
                </Box>

                <Grid container spacing={3}>
                    {/* Tier 1 */}
                    <Grid item xs={12} md={4}>
                        <Card sx={{ p: 1.5, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(10, 15, 29, 0.4)' : '#ffffff' }}>
                            <CardContent sx={{ p: 2, flexGrow: 1 }}>
                                <Typography variant="caption" sx={{ color: '#3b82f6', letterSpacing: 1.2, fontWeight: 900, display: 'block', mb: 1, textTransform: 'uppercase', textAlign: 'left' }}>CRUDE FIELD OPERATIONS</Typography>
                                <Typography variant="h6" fontWeight={850} sx={{ fontSize: '1.25rem', textAlign: 'left' }}>Field Monitor</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 1.5, mb: 2 }}>
                                    <Typography variant="h4" fontWeight={900} className="font-mono">0.5</Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={750}>APT / Mo</Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 3, textAlign: 'left' }}>
                                    Essential sub-second sensor reading, baseline wellhead analytics, and secure REST telemetry logs for small producers.
                                </Typography>
                                <Divider sx={{ mb: 2.5 }} />
                                <Stack spacing={1} sx={{ mb: 2 }}>
                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.78rem', color: 'text.secondary', textAlign: 'left' }}>
                                        <CheckIcon sx={{ color: '#10b981', fontSize: 16 }} /> Standard telemetry API (Limit 10)
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.78rem', color: 'text.secondary', textAlign: 'left' }}>
                                        <CheckIcon sx={{ color: '#10b981', fontSize: 16 }} /> Simple leak trigger alerts
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.78rem', color: 'text.secondary', textAlign: 'left' }}>
                                        <CheckIcon sx={{ color: '#10b981', fontSize: 16 }} /> Standard support dashboard (M-F)
                                    </Typography>
                                </Stack>
                            </CardContent>
                            <Button variant="contained" component={Link} to="/subscriptions" fullWidth sx={{ bgcolor: 'rgba(148, 163, 184, 0.08)', color: 'text.primary', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'rgba(148, 163, 184, 0.15)' } }}>
                                Subscribe Field Access
                            </Button>
                        </Card>
                    </Grid>

                    {/* Tier 2: Popular Premium */}
                    <Grid item xs={12} md={4}>
                        <Card
                            sx={{
                                p: 1.5,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative',
                                overflow: 'hidden',
                                border: '1px solid rgba(245, 158, 11, 0.25)',
                                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(23, 20, 15, 0.5)' : '#ffffff'
                            }}
                        >
                            {/* Premium popular ribbon */}
                            <Box sx={{ position: 'absolute', top: 12, right: -25, bgcolor: '#f59e0b', color: '#000', fontSize: '0.58rem', fontWeight: 900, px: 3, py: 0.3, transform: 'rotate(45deg)', letterSpacing: 0.8 }}>
                                RECOMMENDED
                            </Box>
                            <CardContent sx={{ p: 2, flexGrow: 1 }}>
                                <Typography variant="caption" sx={{ color: '#f59e0b', letterSpacing: 1.2, fontWeight: 900, display: 'block', mb: 1, textTransform: 'uppercase', textAlign: 'left' }}>REFINERY STREAM TIERS</Typography>
                                <Typography variant="h6" fontWeight={850} sx={{ fontSize: '1.25rem', textAlign: 'left' }}>Control Supervisor</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 1.5, mb: 2 }}>
                                    <Typography variant="h4" fontWeight={900} className="font-mono">1.0</Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={750}>APT / Mo</Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 3, textAlign: 'left' }}>
                                    Unrestricted telemetry pipelines, full drill-to-refinery custody provenance timeline tools, and active loyalty discounts.
                                </Typography>
                                <Divider sx={{ mb: 2.5 }} />
                                <Stack spacing={1} sx={{ mb: 2 }}>
                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.78rem', color: 'text.secondary', textAlign: 'left' }}>
                                        <CheckIcon sx={{ color: '#10b981', fontSize: 16 }} /> Unlimited node telemetry stream
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.78rem', color: 'text.secondary', textAlign: 'left' }}>
                                        <CheckIcon sx={{ color: '#10b981', fontSize: 16 }} /> Provenance batches (Aptos Move)
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.78rem', color: 'text.secondary', textAlign: 'left' }}>
                                        <CheckIcon sx={{ color: '#10b981', fontSize: 16 }} /> Full grace cancellation + refund
                                    </Typography>
                                </Stack>
                            </CardContent>
                            <Button variant="contained" component={Link} to="/subscriptions" fullWidth sx={{ bgcolor: '#f59e0b', color: '#000', fontWeight: 800, '&:hover': { bgcolor: '#d19830' } }}>
                                Deploy Supervisor Plan
                            </Button>
                        </Card>
                    </Grid>

                    {/* Tier 3 */}
                    <Grid item xs={12} md={4}>
                        <Card sx={{ p: 1.5, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(10, 15, 29, 0.4)' : '#ffffff' }}>
                            <CardContent sx={{ p: 2, flexGrow: 1 }}>
                                <Typography variant="caption" sx={{ color: '#06b6d4', letterSpacing: 1.2, fontWeight: 900, display: 'block', mb: 1, textTransform: 'uppercase', textAlign: 'left' }}>OFFSHORE RIG COMMAND</Typography>
                                <Typography variant="h6" fontWeight={850} sx={{ fontSize: '1.25rem', textAlign: 'left' }}>Direct Command</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 1.5, mb: 2 }}>
                                    <Typography variant="h4" fontWeight={900} className="font-mono">2.5</Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={750}>APT / Mo</Typography>
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 3, textAlign: 'left' }}>
                                    Comprehensive enterprise platform: ML anomaly alerts, CSV exporting, on-chain operator promo setups, and multi-region tracker arrays.
                                </Typography>
                                <Divider sx={{ mb: 2.5 }} />
                                <Stack spacing={1} sx={{ mb: 2 }}>
                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.78rem', color: 'text.secondary', textAlign: 'left' }}>
                                        <CheckIcon sx={{ color: '#10b981', fontSize: 16 }} /> Custom promo code setups (On-Chain)
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.78rem', color: 'text.secondary', textAlign: 'left' }}>
                                        <CheckIcon sx={{ color: '#10b981', fontSize: 16 }} /> Interactive refinery mapping & logs
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.78rem', color: 'text.secondary', textAlign: 'left' }}>
                                        <CheckIcon sx={{ color: '#10b981', fontSize: 16 }} /> 24/7 dedicated support staff
                                    </Typography>
                                </Stack>
                            </CardContent>
                            <Button variant="contained" component={Link} to="/subscriptions" fullWidth sx={{ bgcolor: 'rgba(148, 163, 184, 0.08)', color: 'text.primary', border: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'rgba(148, 163, 184, 0.15)' } }}>
                                Acquire Command Fleet
                            </Button>
                        </Card>
                    </Grid>
                </Grid>
            </Box>

            {/* Comprehensive Oil & Gas Features Grid */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography variant="h5" fontWeight={900} color="primary" sx={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Integrated Enterprise IoT & Blockchain Features
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Comprehensive workflows linking upstream arrays to robust digital ledger records.
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
