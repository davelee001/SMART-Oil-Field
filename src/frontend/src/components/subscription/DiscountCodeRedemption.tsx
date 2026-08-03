import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Chip } from '@mui/material';
import { LocalOffer } from '@mui/icons-material';
import { toast } from 'react-toastify';

// Mock promo codes — real validation happens on-chain in the subscription Move module.
const MOCK_PROMO_CODES: Record<string, number> = {
    OILFIELD10: 10,
    WELCOME20: 20,
    LOYALTY15: 15,
};

interface DiscountCodeRedemptionProps {
    onCodeApplied: (code: string, percent: number) => void;
    appliedCode: string | null;
}

const DiscountCodeRedemption: React.FC<DiscountCodeRedemptionProps> = ({ onCodeApplied, appliedCode }) => {
    const [code, setCode] = useState('');

    const handleApply = () => {
        const normalized = code.trim().toUpperCase();
        if (!normalized) {
            toast.warning('Enter a promo code first');
            return;
        }

        const percent = MOCK_PROMO_CODES[normalized];
        if (!percent) {
            toast.error(`"${normalized}" is not a valid or active promo code`);
            return;
        }

        onCodeApplied(normalized, percent);
        toast.success(`Promo code applied: ${percent}% off`);
        setCode('');
    };

    return (
        <Box>
            <Typography variant="subtitle1" gutterBottom>
                Discount Code
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                    size="small"
                    placeholder="Enter promo code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                />
                <Button variant="outlined" startIcon={<LocalOffer />} onClick={handleApply}>
                    Apply
                </Button>
                {appliedCode && (
                    <Chip color="success" label={`Applied: ${appliedCode}`} size="small" />
                )}
            </Box>
        </Box>
    );
};

export default DiscountCodeRedemption;
