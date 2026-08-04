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
        toast.success('Thank you! We will reach out with early access details.');
        setContactEmail('');
    };

    return (
        <Box sx={{ width: '100%', overflowX: 'hidden' }}>
            {/* Hero Section */}
            <Paper
                elevation={0}
                sx={{
                    background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
                    color: '#ffffff',
                    borderRadius: 3,
                    p: { xs: 4, md: 8 },
                    mb: 6,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                <Container maxWidth="lg">
                    <Grid container spacing={4} alignItems="center">
                        <Grid item xs={12} md={7}>
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <Chip
                                    icon={<SparklesIcon sx={{ color: '#ffd700 !important' }} />}
                                    label="Next-Gen Energy Tech • Aptos Powered"
                                    sx={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                        color: '#ffffff',
                                        fontWeight: 600,
                                        mb: 2,
                                        backdropFilter: 'blur(10px)',
                                    }}
                                />
                                <Typography
                                    variant="h2"
                                    component="h1"
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: { xs: '2.2rem', md: '3.4rem' },
                                        lineHeight: 1.2,
                                        mb: 2,
                                    }}
                                >
                                    Real-Time Telemetry meets <span style={{ color: '#64b5f6' }}>Blockchain Trust</span>
                                </Typography>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        color: 'rgba(255, 255, 255, 0.85)',
                                        fontWeight: 400,
                                        mb: 4,
                                        fontSize: { xs: '1rem', md: '1.2rem' },
                                    }}
                                >
                                    Monitor oil wells, automate predictive maintenance with AI, and verify movement provenance on Aptos Move smart contracts — all in one unified platform.
                                </Typography>

                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        component={Link}
                                        to="/"
                                        endIcon={<ArrowForwardIcon />}
                                        sx={{
                                            backgroundColor: '#1e3c72',
                                            '&:hover': { backgroundColor: '#2a5298' },
                                            px: 4,
                                            py: 1.5,
                                            fontWeight: 700,
                                            borderRadius: 2,
                                        }}
                                    >
                                        Launch Dashboard
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="large"
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
                                            px: 3,
                                            py: 1.5,
                                            fontWeight: 600,
                                            borderRadius: 2,
                                        }}
                                    >
                                        View Pricing & Plans
                                    </Button>
                                </Stack>
                            </motion.div>
                        </Grid>

                        <Grid item xs={12} md={5}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                            >
                                <Paper
                                    elevation={8}
                                    sx={{
                                        p: 3,
                                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                        backdropFilter: 'blur(12px)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: 3,
                                        color: '#ffffff',
                                    }}
                                >
                                    <Typography variant="subtitle2" sx={{ opacity: 0.8, textTransform: 'uppercase', tracking: 1, mb: 1 }}>
                                        Live Operations Snapshot
                                    </Typography>
                                    <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.2)', mb: 2 }} />

                                    <Stack spacing={2}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="body2">Active Wells</Typography>
                                            <Chip label="5 / 6 Active" color="success" size="small" />
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="body2">Total Production</Typography>
                                            <Typography variant="body1" fontWeight={700}>8,770 bbl/d</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="body2">Aptos Network Status</Typography>
                                            <Chip label="Testnet Synced" color="info" size="small" />
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="body2">AI Health Score</Typography>
                                            <Typography variant="body1" fontWeight={700} color="#81c784">98.4% Normal</Typography>
                                        </Box>
                                    </Stack>

                                    <Button
                                        fullWidth
                                        variant="contained"
                                        size="medium"
                                        onClick={() => navigate('/')}
                                        sx={{ mt: 3, backgroundColor: 'rgba(255, 255, 255, 0.2)', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' } }}
                                    >
                                        Explore Interactive Map & Well Data
                                    </Button>
                                </Paper>
                            </motion.div>
                        </Grid>
                    </Grid>
                </Container>
            </Paper>

            {/* Key Metrics Banner */}
            <Container maxWidth="lg" sx={{ mb: 8 }}>
                <Grid container spacing={3}>
                    {METRICS.map((metric, idx) => (
                        <Grid item xs={6} md={3} key={metric.label}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: idx * 0.1 }}
                            >
                                <Paper
                                    elevation={1}
                                    sx={{
                                        p: 3,
                                        textAlign: 'center',
                                        borderRadius: 2,
                                        borderTop: '4px solid #1e3c72',
                                    }}
                                >
                                    <Typography variant="h4" color="primary" fontWeight={800}>
                                        {metric.value}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                        {metric.label}
                                    </Typography>
                                </Paper>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Container>

            {/* Core Features Grid */}
            <Container maxWidth="lg" sx={{ mb: 8 }}>
                <Box textAlign="center" sx={{ mb: 5 }}>
                    <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1.5}>
                        Capabilities Overview
                    </Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
                        Built for Operators, Engineers & Stakeholders
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 680, mx: 'auto', mt: 1 }}>
                        From SCADA IoT sensors to Aptos Move smart contracts, our stack covers every layer of modern energy field management.
                    </Typography>
                </Box>

                <Grid container spacing={4}>
                    {FEATURES.map((feat, idx) => (
                        <Grid item xs={12} sm={6} md={4} key={feat.title}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: idx * 0.1 }}
                                style={{ height: '100%' }}
                            >
                                <Card
                                    elevation={2}
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        borderRadius: 3,
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        '&:hover': {
                                            transform: 'translateY(-6px)',
                                            boxShadow: 6,
                                        },
                                    }}
                                >
                                    <CardContent sx={{ p: 3, flexGrow: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                            {feat.icon}
                                            <Chip label={feat.chip} size="small" variant="outlined" color="primary" />
                                        </Box>
                                        <Typography variant="h6" fontWeight={700} gutterBottom>
                                            {feat.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {feat.description}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Container>

            {/* Architecture Preview Section */}
            <Paper sx={{ backgroundColor: '#f8f9fa', py: 8, mb: 8 }}>
                <Container maxWidth="lg">
                    <Grid container spacing={4} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1.5}>
                                Full-Stack Synergy
                            </Typography>
                            <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5, mb: 2 }}>
                                How the SMART Oil Field Engine Works
                            </Typography>
                            <Typography variant="body1" color="text.secondary" paragraph>
                                Sensor telemetry flows into our high-speed ingestion gateway (Python FastAPI & Express/TypeScript). Real-time streams are cached in Redis and dispatched through RabbitMQ to machine learning pipelines for instant anomaly scoring.
                            </Typography>
                            <Typography variant="body1" color="text.secondary" paragraph>
                                Critical custody events and subscription rights are simultaneously committed to Move modules deployed on Aptos, giving operators tamper-proof auditability.
                            </Typography>

                            <Stack spacing={1.5} sx={{ mt: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CheckIcon color="success" />
                                    <Typography variant="body2" fontWeight={600}>REST, GraphQL & WebSocket API Gateway</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CheckIcon color="success" />
                                    <Typography variant="body2" fontWeight={600}>Move Smart Contracts on Aptos Blockchain</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CheckIcon color="success" />
                                    <Typography variant="body2" fontWeight={600}>Scikit-Learn & PyTorch ML Anomaly Engines</Typography>
                                </Box>
                            </Stack>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Paper
                                elevation={4}
                                sx={{
                                    p: 3,
                                    borderRadius: 3,
                                    backgroundColor: '#0f2027',
                                    color: '#ffffff',
                                    fontFamily: 'monospace',
                                }}
                            >
                                <Typography variant="caption" color="primary.light" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                                    Architecture Stack
                                </Typography>
                                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 1.5 }} />

                                <Box sx={{ fontSize: '0.85rem', lineHeight: 1.8 }}>
                                    <Typography component="div" color="#81c784">[Frontend]</Typography>
                                    <Typography component="div" sx={{ pl: 2, color: 'rgba(255,255,255,0.7)' }}>
                                        React 18 • TypeScript • MUI 5 • Webpack 5
                                    </Typography>

                                    <Typography component="div" color="#64b5f6" sx={{ mt: 1 }}>[Ingestion & Gateway]</Typography>
                                    <Typography component="div" sx={{ pl: 2, color: 'rgba(255,255,255,0.7)' }}>
                                        Python FastAPI • Node.js TS Backend • Redis • RabbitMQ
                                    </Typography>

                                    <Typography component="div" color="#ffd54f" sx={{ mt: 1 }}>[Blockchain Layer]</Typography>
                                    <Typography component="div" sx={{ pl: 2, color: 'rgba(255,255,255,0.7)' }}>
                                        Aptos Move Contracts • `oil_tracker` • `subscriptions`
                                    </Typography>

                                    <Typography component="div" color="#ff8a65" sx={{ mt: 1 }}>[Data Science Suite]</Typography>
                                    <Typography component="div" sx={{ pl: 2, color: 'rgba(255,255,255,0.7)' }}>
                                        ETL Pipelines • ML Anomaly Models • Stream Processors
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </Container>
            </Paper>

            {/* Pricing Section Teaser */}
            <Container maxWidth="lg" sx={{ mb: 8 }}>
                <Box textAlign="center" sx={{ mb: 5 }}>
                    <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1.5}>
                        Transparent Subscription
                    </Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
                        Flexible Plans Payable in APT Token
                    </Typography>
                </Box>

                <Grid container spacing={4}>
                    {PLANS.map((plan) => (
                        <Grid item xs={12} md={4} key={plan.name}>
                            <Card
                                elevation={plan.highlighted ? 8 : 2}
                                sx={{
                                    borderRadius: 3,
                                    position: 'relative',
                                    border: plan.highlighted ? '2px solid #1e3c72' : '1px solid #e0e0e0',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                {plan.badge && (
                                    <Chip
                                        label={plan.badge}
                                        color="primary"
                                        size="small"
                                        sx={{
                                            position: 'absolute',
                                            top: 16,
                                            right: 16,
                                            fontWeight: 700,
                                        }}
                                    />
                                )}
                                <CardContent sx={{ p: 4, flexGrow: 1 }}>
                                    <Typography variant="h6" fontWeight={700}>
                                        {plan.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40, mt: 1 }}>
                                        {plan.description}
                                    </Typography>

                                    <Box sx={{ my: 3, display: 'flex', alignItems: 'baseline' }}>
                                        <Typography variant="h3" fontWeight={800} color="primary">
                                            {plan.price}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                            {plan.period}
                                        </Typography>
                                    </Box>

                                    <Divider sx={{ mb: 3 }} />

                                    <Stack spacing={1.5}>
                                        {plan.features.map((feat) => (
                                            <Box key={feat} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <CheckIcon color="success" fontSize="small" />
                                                <Typography variant="body2">{feat}</Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                </CardContent>

                                <Box sx={{ p: 3, pt: 0 }}>
                                    <Button
                                        fullWidth
                                        variant={plan.highlighted ? 'contained' : 'outlined'}
                                        color="primary"
                                        component={Link}
                                        to="/subscriptions"
                                        sx={{ py: 1.2, fontWeight: 700, borderRadius: 2 }}
                                    >
                                        Select Plan
                                    </Button>
                                </Box>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Container>

            {/* FAQ Accordion */}
            <Container maxWidth="md" sx={{ mb: 8 }}>
                <Box textAlign="center" sx={{ mb: 4 }}>
                    <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={1.5}>
                        Questions & Answers
                    </Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ mt: 0.5 }}>
                        Frequently Asked Questions
                    </Typography>
                </Box>

                <Stack spacing={2}>
                    {FAQS.map((faq) => (
                        <Accordion key={faq.q} sx={{ borderRadius: 2, '&:before': { display: 'none' }, boxShadow: 1 }}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography fontWeight={700}>{faq.q}</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Typography variant="body2" color="text.secondary">
                                    {faq.a}
                                </Typography>
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Stack>
            </Container>

            {/* Stay Connected / Newsletter */}
            <Paper
                elevation={0}
                sx={{
                    backgroundColor: '#1e3c72',
                    color: '#ffffff',
                    borderRadius: 3,
                    p: { xs: 4, md: 6 },
                    textAlign: 'center',
                }}
            >
                <Container maxWidth="sm">
                    <Typography variant="h4" fontWeight={800} gutterBottom>
                        Stay Updated on SMART Oil Field Releases
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.85, mb: 4 }}>
                        Get monthly updates on new Move smart contract deployments, ML anomaly algorithms, and dashboard feature drops.
                    </Typography>

                    <form onSubmit={handleNewsletterSubmit}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                                fullWidth
                                variant="outlined"
                                placeholder="Enter your work email..."
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <EmailIcon sx={{ color: '#ffffff' }} />
                                        </InputAdornment>
                                    ),
                                    sx: {
                                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                        color: '#ffffff',
                                        borderRadius: 2,
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                        '&:hover fieldset': { borderColor: '#ffffff' },
                                    },
                                }}
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                sx={{
                                    backgroundColor: '#ffffff',
                                    color: '#1e3c72',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    px: 4,
                                    '&:hover': { backgroundColor: '#f0f0f0' },
                                    borderRadius: 2,
                                }}
                            >
                                Subscribe
                            </Button>
                        </Stack>
                    </form>
                </Container>
            </Paper>
        </Box>
    );
};

export default Home;