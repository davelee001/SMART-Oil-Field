import React from 'react';
import {
    Container,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Link,
} from '@mui/material';

interface PaymentRecord {
    id: string;
    date: string;
    plan: string;
    amount: number;
    token: 'APT' | 'USDC' | 'USDT';
    status: 'Completed' | 'Refunded' | 'Failed';
    txHash: string;
}

// Mock payment history — replace with data from the subscription Move module / Python API.
const PAYMENTS: PaymentRecord[] = [
    { id: 'pay-001', date: '2026-07-01', plan: 'Pro', amount: 3, token: 'APT', status: 'Completed', txHash: '0x8a1f...c92e' },
    { id: 'pay-002', date: '2026-06-01', plan: 'Pro', amount: 2.55, token: 'APT', status: 'Completed', txHash: '0x4b7d...19aa' },
    { id: 'pay-003', date: '2026-05-01', plan: 'Basic', amount: 1, token: 'USDC', status: 'Completed', txHash: '0xd21e...773b' },
    { id: 'pay-004', date: '2026-04-15', plan: 'Basic', amount: 0.5, token: 'APT', status: 'Refunded', txHash: '0x59aa...0f2c' },
    { id: 'pay-005', date: '2026-03-01', plan: 'Enterprise', amount: 8, token: 'USDT', status: 'Failed', txHash: '0x0012...bbee' },
];

const statusColor = (status: PaymentRecord['status']) => {
    switch (status) {
        case 'Completed':
            return 'success' as const;
        case 'Refunded':
            return 'warning' as const;
        case 'Failed':
            return 'error' as const;
        default:
            return 'default' as const;
    }
};

const PaymentHistory: React.FC = () => {
    return (
        <Container maxWidth={false} sx={{ mt: 2 }}>
            <Typography variant="h4" color="primary" gutterBottom>
                Payment History
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Subscription payments, refunds, and referral/loyalty rewards
            </Typography>

            <Card>
                <CardContent>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Plan</TableCell>
                                    <TableCell align="right">Amount</TableCell>
                                    <TableCell>Token</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Transaction</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {PAYMENTS.map((payment) => (
                                    <TableRow key={payment.id} hover>
                                        <TableCell>{payment.date}</TableCell>
                                        <TableCell>{payment.plan}</TableCell>
                                        <TableCell align="right">{payment.amount.toFixed(2)}</TableCell>
                                        <TableCell>{payment.token}</TableCell>
                                        <TableCell>
                                            <Chip label={payment.status} color={statusColor(payment.status)} size="small" />
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={`https://explorer.aptoslabs.com/txn/${payment.txHash}?network=testnet`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {payment.txHash}
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Container>
    );
};

export default PaymentHistory;
