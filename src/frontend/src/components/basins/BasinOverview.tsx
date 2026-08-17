import React from 'react';
import { Box, Card, CardContent, Chip, Grid, Typography } from '@mui/material';
import { OIL_BASINS, OIL_WELLS } from '../../data/oilFields';

const BasinOverview: React.FC = () => (
    <Box component="section" aria-labelledby="basin-overview-title" sx={{ mb: 3 }}>
        <Box sx={{ mb: 1.5 }}>
            <Typography id="basin-overview-title" variant="h6" fontWeight={750}>
                Oil Basin Management
            </Typography>
            <Typography variant="body2" color="text.secondary">
                South Sudan operating areas and assigned field inventory
            </Typography>
        </Box>

        <Grid container spacing={2}>
            {OIL_BASINS.map((basin) => {
                const wells = OIL_WELLS.filter((well) => well.basin === basin.name);
                return (
                    <Grid item xs={12} md={4} key={basin.name}>
                        <Card sx={{ height: '100%', borderTop: '3px solid', borderTopColor: wells.length ? 'secondary.main' : 'divider' }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
                                    <Typography variant="h6" fontWeight={750}>{basin.name}</Typography>
                                    <Chip label={basin.operatorCode} size="small" color={wells.length ? 'secondary' : 'default'} />
                                </Box>
                                <Typography variant="body2" fontWeight={650}>{basin.operator}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {basin.blocks.join(', ')}
                                </Typography>

                                <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                                    {basin.fields.length ? (
                                        <>
                                            <Typography variant="body2">{basin.fields.join(' · ')}</Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                {wells.length} wells assigned
                                            </Typography>
                                        </>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            Awaiting field and well data
                                        </Typography>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                );
            })}
        </Grid>
    </Box>
);

export default BasinOverview;
