import React from 'react';
import { Card, CardContent, Skeleton, Box } from '@mui/material';

interface LoadingCardProps {
    height?: number;
    lines?: number;
}

const LoadingCard: React.FC<LoadingCardProps> = ({ height = 200, lines = 3 }) => {
    return (
        <Box sx={{ height }}>
            <Skeleton variant="text" sx={{ fontSize: '1.5rem', mb: 2 }} />
            {Array.from({ length: lines }).map((_, index) => (
                <Skeleton
                    key={index}
                    variant="rectangular"
                    height={height / (lines + 1)}
                    sx={{ mb: 1 }}
                />
            ))}
        </Box>
    );
};

export default LoadingCard;