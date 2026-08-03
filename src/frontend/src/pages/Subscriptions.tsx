import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Grid,
    Card,
    CardContent,
    CardActions,
    Typography,
    Box,
    Chip,
    Button,
    Divider,
} from '@mui/material';
import { toast } from 'react-toastify';

import DiscountCodeRedemption from '../components/subscription/DiscountCodeRedemption';
import { getStoredUser } from '../utils/auth';

interface Plan {
    id: string;
    name: string;
    priceApt: number;
    durationDays: number;
    perks: string[];
}

// Mock plans — replace with data from the subscription Move module / Python API.
const PLANS: Plan[] = [
    { id: 'basic', name: 'Basic', priceApt: 1, durationDays: 30, perks: ['Telemetry access', 'Email alerts'] },
    { id: 'pro', name: 'Pro', priceApt: 3, durationDays: 30, perks: ['Telemetry access', 'Real-time alerts', 'Oil tracking'] },
    { id: 'enterprise', name: 'Enterprise', priceApt: 8, durationDays: 30, perks: ['All Pro features', 'Priority support', 'Custom analytics'] },
];

const Subscriptions: React.FC = () => {
    const navigate = useNavigate();
    const user = getStoredUser();
    const [activePlanId, setActivePlanId] = useState<string | null>(null);
    const [appliedCode, setAppliedCode] = useState<string | null>(null);
    const [discountPercent, setDiscountPercent] = useState(0);

    const handleSubscribe = (plan: Plan) => {
        if (!user) {
            toast.info('Please sign in to subscribe');
            navigate('/login');
            return;
        }
        setActivePlanId(plan.id);
        toast.success(`Subscribed to ${plan.name} plan`);
    };

    const handleCancel = () => {
        setActivePlanId(null);
        toast.info('Subscription canceled — 5-day grace period started');
    };

    const priceFor = (plan: Plan) =>
        (plan.priceApt * (1 - discountPercent / 100)).toFixed(2);

    const activePlan = useMemo(() => PLANS.find((p) => p.id === activePlanId) ?? null, [activePlanId]);

    return (
        <Container maxWidth={false} sx={{ mt: 2 }}>
            <Typography variant="h4" color="primary" gutterBottom>
                Subscription Management
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Manage your plan, apply discount codes, and view active subscription status
            </Typography>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Current Subscription
                    </Typography>
                    {activePlan ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            <Chip color="success" label={`${activePlan.name} — active`} />
                            <Typography variant="body2">
                                {priceFor(activePlan)} APT / {activePlan.durationDays} days
                            </Typography>
                            <Button variant="outlined" color="error" size="small" onClick={handleCancel}>
                                Cancel Subscription
                            </Button>
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            No active subscription. Choose a plan below to get started.
                        </Typography>
                    )}

                    <Divider sx={{ my: 2 }} />

                    <DiscountCodeRedemption
                        appliedCode={appliedCode}
                        onCodeApplied={(code, percent) => {
                            setAppliedCode(code);
                            setDiscountPercent(percent);
                        }}
                    />
                </CardContent>
            </Card>

            <Grid container spacing={3}>
                {PLANS.map((plan) => (
                    <Grid item xs={12} sm={6} md={4} key={plan.id}>
                        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <CardContent sx={{ flexGrow: 1 }}>
                                <Typography variant="h6" gutterBottom>
                                    {plan.name}
                                </Typography>
                                <Typography variant="h4" color="primary.main" gutterBottom>
                                    {priceFor(plan)} APT
                                    {discountPercent > 0 && (
                                        <Typography
                                            component="span"
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ ml: 1, textDecoration: 'line-through' }}
                                        >
                                            {plan.priceApt} APT
                                        </Typography>
                                    )}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    per {plan.durationDays} days
                                </Typography>
                                <Box sx={{ mt: 2 }}>
                                    {plan.perks.map((perk) => (
                                        <Chip key={perk} label={perk} size="small" sx={{ mr: 1, mb: 1 }} />
                                    ))}
                                </Box>
                            </CardContent>
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
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
};

export default Subscriptions;
