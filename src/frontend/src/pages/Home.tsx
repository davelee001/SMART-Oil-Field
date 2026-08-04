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
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

const FEATURES = [
    {
        icon: <TelemetryIcon sx={{ fontSize: 40, color: '#1e3c72' }} />,
        title: 'Real-Time Telemetry',
        description: 'Instant visibility into oil well pressure, temperature, flow rates, and status alerts with sub-second polling and WebSocket feeds.',
        chip: 'Live Data',
    },
    {
        icon: <BlockchainIcon sx={{ fontSize: 40, color: '#2a5298' }} />,
        title: 'Aptos Blockchain Security',
        description: 'Immutable oil movement tracking, decentralized provenance certificates, and smart-contract backed subscription management.',
        chip: 'Move Smart Contracts',
    },
    {
        icon: <AnalyticsIcon sx={{ fontSize: 40, color: '#1e3c72' }} />,
        title: 'AI Predictive Maintenance',
        description: 'Machine learning pipelines predict anomaly events, equipment degradation, and maintenance windows before costly failures occur.',
        chip: 'ML Driven',
    },
    {
        icon: <AlertIcon sx={{ fontSize: 40, color: '#e65100' }} />,
        title: 'Automated Reminders & Alerts',
        description: 'Smart expiration notifications and critical telemetry threshold alerts delivered via multi-channel notification handlers.',
        chip: 'Smart Alerts',
    },
    {
        icon: <SpeedIcon sx={{ fontSize: 40, color: '#2a5298' }} />,
        title: 'High-Throughput Gateway',
        description: 'TypeScript & Python backends with Redis caching and RabbitMQ queueing capable of processing millions of sensor events daily.',
        chip: 'Enterprise Architecture',
    },
    {
        icon: <PricingIcon sx={{ fontSize: 40, color: '#2e7d32' }} />,
        title: 'Transparent APT Billing',
        description: 'Flexible tier plans payable natively in APT token with automated discount code redemption and clear payment logs.',
        chip: 'Aptos Native',
    },
];

const METRICS = [
    { label: 'Monitored Wells', value: '1,250+' },
    { label: 'Daily Sensor Readings', value: '45M+' },
    { label: 'Blockchain Tx Logged', value: '850K+' },
    { label: 'Uptime SLA', value: '99.99%' },
];

const PLANS = [
    {
        name: 'Basic Explorer',
        price: '1 APT',
        period: '/ month',
        description: 'Ideal for independent operators managing single fields.',
        features: ['Up to 5 Oil Wells', '15-min Telemetry Updates', 'Basic PDF/Excel Reports', 'Email Support'],
        highlighted: false,
    },
    {
        name: 'Pro Field',
        price: '3 APT',
        period: '/ month',
        description: 'Designed for growing energy enterprises and multi-field operations.',
        features: ['Up to 25 Oil Wells', 'Real-time WebSocket Data', 'AI Predictive Maintenance', 'Move Blockchain Provenance', 'Priority Support'],
        highlighted: true,
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
