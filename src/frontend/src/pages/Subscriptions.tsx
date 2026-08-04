import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    Button,
    Divider,
    Paper,
    Stack,
} from '@mui/material';
import {
    CheckCircleOutline as CheckIcon,
    StarsOutlined as StarIcon,
    AutoAwesome as SparklesIcon,
    HelpOutline as HelpIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';

import DiscountCodeRedemption from '../components/subscription/DiscountCodeRedemption';
import { getStoredUser } from '../utils/auth';

interface Plan {
    id: string;
    name: string;
    priceApt: number;
    durationDays: number;
    description: string;
    perks: string[];
    popular?: boolean;
}

const PLANS: Plan[] = [
    {
        id: 'basic',
        name: 'Basic Explorer',
        priceApt: 1,
        durationDays: 30,
        description: 'Ideal for independent operators managing single wells.',
        perks: ['Telemetry access (15m poll)', 'Email alert integration', 'Basic PDF reporting', 'Single user access'],
    },
    {
        id: 'pro',
        name: 'Pro Field Operator',
        priceApt: 3,
        durationDays: 30,
        description: 'Designed for growing energy fleets requiring real-time feeds.',
        perks: ['Real-time WebSocket telemetry', 'AI Anomaly detection alerts', 'Move Blockchain oil provenance', 'Excel & PDF exports', '5 Operator seats'],
        popular: true,
    },
    {
        id: 'enterprise',
        name: 'Enterprise Fleet',
        priceApt: 8,
        durationDays: 30,
        description: 'Complete custom deployment for major oil producers.',
        perks: ['Sub-second stream processing', 'Dedicated Move smart contract', 'Custom ML anomaly training', '24/7 Priority SLA support', 'Unlimited operator seats'],
    },
];

const Subscriptions: React.FC = () => {
    const navigate = useNavigate();
    const user = getStoredUser();
    const [activePlanId, setActivePlanId] = useState<string | null>('pro');
    const [appliedCode, setAppliedCode] = useState<string | null>(null);
    const [discountPercent, setDiscountPercent] = useState(0);

    const handleSubscribe = (plan: Plan) => {
        if (!user) {
            toast.info('Please sign in to subscribe');
            navigate('/login');
            return;
        }
        setActivePlanId(plan.id);
        toast.success(`Subscribed to ${plan.name} plan via Aptos Move!`);
    };

    const handleCancel = () => {
        setActivePlanId(null);
        toast.info('Subscription canceled — 5-day grace period activated on-chain');
    };

    const priceFor = (plan: Plan) =>
        (plan.priceApt * (1 - discountPercent / 100)).toFixed(2);

    const activePlan = useMemo(() => PLANS.find((p) => p.id === activePlanId) ?? null, [activePlanId]);

    return (
        <Container maxWidth={false} sx={{ py: 1, px: { xs: 1.5, sm: 2, md: 3 } }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" color="primary" fontWeight={800} gutterBottom>
                    Subscription & License Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Manage Move smart contract plans, apply promo codes, and handle token billing.
                </Typography>
            </Box>

            <Paper
                elevation={1}
                sx={{
                    p: 2.5,
                    mb: 3,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    background: (theme) =>
                        theme.palette.mode === 'dark'
                            ? 'linear-gradient(110deg, #102A3A 0%, #173F5F 100%)'
                            : 'linear-gradient(110deg, #F0F4F8 0%, #E2E8F0 100%)',
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
                            ACTIVE APTOS MOVE SUBSCRIPTION
                        </Typography>
                        {activePlan ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                                <Typography variant="h5" fontWeight={800} color="primary">
                                    {activePlan.name}
                                </Typography>
                                <Chip color="success" label="Active • Synced On-Chain" size="small" />
                            </Box>
                        ) : (
                            <Typography variant="h6" color="text.secondary" sx={{ mt: 0.5 }}>
                                No Active Subscription (Grace Period Expired)
                            </Typography>
                        )}
                    </Box>

                    {activePlan && (
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Typography variant="body2" fontWeight={700}>
                                {priceFor(activePlan)} APT / 30 Days
                            </Typography>
                            <Button variant="outlined" color="error" size="small" onClick={handleCancel}>
                                Cancel Subscription
                            </Button>
                        </Stack>
                    )}
                </Box>

                <Divider sx={{ my: 2 }} />

                <DiscountCodeRedemption
                    appliedCode={appliedCode}
                    onCodeApplied={(code, percent) => {
                        setAppliedCode(code);
                        setDiscountPercent(percent);
                    }}
                />
            </Paper>

            <Grid container spacing={3}>
                {PLANS.map((plan) => {
                    const isCurrent = activePlanId === plan.id;
                    return (
                        <Grid item xs={12} md={4} key={plan.id}>
                            <Card
                                elevation={plan.popular ? 4 : 1}
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justify: 'space-between',
                                    position: 'relative',
                                    borderColor: plan.popular ? 'primary.main' : 'divider',
                                    borderWidth: plan.popular ? '2px' : '1px',
                                }}
                            >
                                {plan.popular && (
                                    <Chip
                                        icon={<StarIcon sx={{ fontSize: 14, color: '#ffffff !important' }} />}
                                        label="MOST POPULAR"
                                        color="primary"
                                        size="small"
                                        sx={{
                                            position: 'absolute',
                                            top: -12,
                                            right: 16,
                                            fontWeight: 800,
                                            fontSize: '0.65rem',
                                            px: 0.5,
                                        }}
                                    />
                                )}

                                <CardContent sx={{ p: 2.5 }}>
                                    <Typography variant="h6" fontWeight={800}>
                                        {plan.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, minHeight: 32 }}>
                                        {plan.description}
                                    </Typography>

                                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 2 }}>
                                        <Typography variant="h4" fontWeight={800} color="primary">
                                            {priceFor(plan)} APT
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            / month
                                        </Typography>
                                    </Box>

                                    <Divider sx={{ mb: 2 }} />

                                    <Stack spacing={1}>
                                        {plan.perks.map((perk) => (
                                            <Box key={perk} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <CheckIcon color="success" sx={{ fontSize: 18 }} />
                                                <Typography variant="caption" fontWeight={600}>
                                                    {perk}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Stack>
                                </CardContent>

                                <Box sx={{ p: 2.5, pt: 0 }}>
                                    <Button
                                        fullWidth
                                        variant={isCurrent ? 'outlined' : plan.popular ? 'contained' : 'outlined'}
                                        color={isCurrent ? 'success' : 'primary'}
                                        disabled={isCurrent}
                                        onClick={() => handleSubscribe(plan)}
                                        sx={{ py: 1 }}
                                    >
                                        {isCurrent ? 'Current Active Plan' : 'Subscribe via Aptos'}
                                    </Button>
                                </Box>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
        </Container>
    );
};

export default Subscriptions;
                                    per { plan.durationDays } days
                                </Typography >
    <Box sx={{ mt: 2 }}>
        {plan.perks.map((perk) => (
            <Chip key={perk} label={perk} size="small" sx={{ mr: 1, mb: 1 }} />
        ))}
    </Box>
                            </CardContent >
    <CardActions sx={{ p: 2 }}>
        <Button
            fullWidth
            variant={activePlanId === plan.id ? 'outlined' : 'contained'}
            disabled={activePlanId === plan.id}
            onClick={() => handleSubscribe(plan)}
        >
            {activePlanId === plan.id ? 'Current Plan' : 'Subscribe'}
        </Button>
    </CardActions>
                        </Card >
                    </Grid >
                ))}
            </Grid >
        </Container >
    );
};

export default Subscriptions;
