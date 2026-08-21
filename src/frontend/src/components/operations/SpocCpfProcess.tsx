import React from 'react';
import {
    Alert, Box, Chip, Grid, Paper, Stack, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Typography,
} from '@mui/material';
import { Air, ArrowForward, DeviceThermostat, LocalFireDepartment, Science, Speed, Storage, Sensors, WaterDrop } from '@mui/icons-material';
import {
    CPF_INLET_RECORDS, CPF_PROCESS_EQUIPMENT, CPF_TREATMENT_PROCESSES, CPF_WATER_TREATMENT,
    FWKO_INTERFACE_POINTS, FWKO_OPERATING_REQUIREMENT,
} from '../../data/spocCpf';

const SpocCpfProcess: React.FC = () => (
    <Box component="section" aria-labelledby="cpf-process-title" sx={{ mb: 3 }}>
        <Box sx={{ mb: 1.5 }}>
            <Typography id="cpf-process-title" variant="h6" fontWeight={800}>CPF inlet and FWKO process</Typography>
            <Typography variant="body2" color="text.secondary">
                SPOC production fluids are received from the OGM inlet lines, combined in the main header, and routed to two Free Water Knock Out tanks.
            </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
            {CPF_TREATMENT_PROCESSES.map((process) => {
                const recorded = process.status === 'RECORDED';
                return (
                    <Grid item xs={12} md={6} key={process.id}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%', borderLeft: '5px solid', borderLeftColor: recorded ? 'info.main' : 'warning.main' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                                <Box>
                                    <Typography variant="h6" fontWeight={800}>{process.name}</Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{process.description}</Typography>
                                </Box>
                                <Chip size="small" label={recorded ? 'Recorded' : 'Awaiting details'} color={recorded ? 'success' : 'warning'} />
                            </Stack>
                        </Paper>
                    </Grid>
                );
            })}
        </Grid>

        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems="center" justifyContent="center" gap={1.5}>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography fontWeight={800}>OGM1-OGM6 + OGM Mala</Typography>
                    <Typography variant="caption" color="text.secondary">Seven instrumented inlet lines</Typography>
                </Box>
                <ArrowForward color="action" />
                <Chip label={CPF_PROCESS_EQUIPMENT.mainHeader.name} sx={{ bgcolor: '#f2c94c', color: '#29230d', fontWeight: 900 }} />
                <ArrowForward color="action" />
                <Stack direction="row" gap={1}>
                    {CPF_PROCESS_EQUIPMENT.fwkoTanks.map((tank) => (
                        <Chip key={tank.id} icon={<Storage />} label={tank.name} color="primary" variant="outlined" />
                    ))}
                </Stack>
            </Stack>
        </Paper>

        <Grid container spacing={2} sx={{ mb: 2 }}>
            {CPF_PROCESS_EQUIPMENT.fwkoTanks.map((tank) => (
                <Grid item xs={12} md={6} key={tank.id}>
                    <Paper variant="outlined" sx={{ p: 2, height: '100%', borderTop: '4px solid', borderTopColor: 'primary.main' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                            <Box><Typography fontWeight={850}>{tank.name}</Typography><Typography variant="caption" color="text.secondary">{tank.id} · {tank.type}</Typography></Box>
                            <Chip size="small" label={`${tank.inletCount} inlet`} />
                        </Stack>
                        <Stack direction="row" flexWrap="wrap" useFlexGap gap={1} sx={{ mt: 2 }}>
                            <Chip size="small" icon={<WaterDrop />} label={tank.outlets[0]} color="info" variant="outlined" />
                            <Chip size="small" label={tank.outlets[1]} sx={{ bgcolor: '#f2c94c', color: '#29230d' }} />
                            <Chip size="small" icon={<Air />} label={tank.outlets[2]} variant="outlined" />
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                            {tank.compartments[0].name}: {tank.compartments[0].phase} | {tank.compartments[1].name}: {tank.compartments[1].phase}
                        </Typography>
                    </Paper>
                </Grid>
            ))}
        </Grid>

        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="caption" fontWeight={800} color="text.secondary">FWKO THREE-PHASE SEPARATION</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} alignItems="center" justifyContent="center" gap={1} sx={{ mt: 1.5 }}>
                <Chip icon={<WaterDrop />} label="Water - Outer tank" color="info" variant="outlined" />
                <Chip label="Crude - Inner tank" sx={{ bgcolor: '#f2c94c', color: '#29230d' }} />
                <Chip icon={<Air />} label="Gas - Degassed from top" variant="outlined" />
                <ArrowForward color="action" />
                <Chip icon={<LocalFireDepartment />} label={CPF_PROCESS_EQUIPMENT.fwkoSeparation.gasHandling.destination} color="warning" variant="outlined" />
                <ArrowForward color="action" />
                <Chip icon={<LocalFireDepartment />} label="Controlled flaring" color="error" variant="outlined" />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>
                Gas is removed from the top of each FWKO, routed through the Flare Knock Out Drum, and flared to prevent direct release of unprocessed hydrocarbons and reduce atmospheric pollution risk.
            </Typography>
        </Paper>

        <Alert severity="info" sx={{ mb: 2 }}>
            OGM6 is registered as a CPF inlet. Its well assignments remain pending until controlled source data is provided.
        </Alert>

        <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label="SPOC CPF inlet instrumentation records">
                <TableHead>
                    <TableRow>
                        <TableCell>Inlet source</TableCell>
                        <TableCell>Destination</TableCell>
                        <TableCell>Pressure gauge</TableCell>
                        <TableCell>Temperature gauge</TableCell>
                        <TableCell>Temperature transmitter</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {CPF_INLET_RECORDS.map((line) => {
                        const pressureGauge = line.instruments.find((item) => item.type === 'PRESSURE_GAUGE')!;
                        const temperatureGauge = line.instruments.find((item) => item.type === 'TEMPERATURE_GAUGE')!;
                        const transmitter = line.instruments.find((item) => item.type === 'TEMPERATURE_TRANSMITTER')!;
                        return (
                            <TableRow key={line.id} hover>
                                <TableCell><Typography fontWeight={800}>{line.source}</Typography><Typography variant="caption" color="text.secondary">{line.id}</Typography></TableCell>
                                <TableCell>{line.destination}</TableCell>
                                <TableCell><Stack direction="row" gap={0.75} alignItems="center"><Speed fontSize="small" color="action" /><Box><Typography variant="body2">{pressureGauge.id}</Typography><Typography variant="caption" color="text.secondary">Local indication</Typography></Box></Stack></TableCell>
                                <TableCell><Stack direction="row" gap={0.75} alignItems="center"><DeviceThermostat fontSize="small" color="action" /><Box><Typography variant="body2">{temperatureGauge.id}</Typography><Typography variant="caption" color="text.secondary">Local indication</Typography></Box></Stack></TableCell>
                                <TableCell><Stack direction="row" gap={0.75} alignItems="center"><Sensors fontSize="small" color="info" /><Box><Typography variant="body2">{transmitter.id}</Typography><Typography variant="caption" color="text.secondary">Signal to DCS</Typography></Box></Stack></TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>

        <Box sx={{ mt: 3, mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={800}>FWKO interface reading record</Typography>
            <Typography variant="body2" color="text.secondary">The same 18-point interface scale applies to FWKO 1 and FWKO 2.</Typography>
        </Box>
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', sm: 'repeat(6, minmax(0, 1fr))', lg: 'repeat(18, minmax(0, 1fr))' }, gap: 0.75 }}>
                {FWKO_INTERFACE_POINTS.map((point) => {
                    const color = point.phase === 'WATER' ? '#8ecae6' : point.phase === 'EMULSION' ? '#9aa3aa' : '#f2c94c';
                    return <Box key={point.level} title={point.operatorResponse} sx={{ minWidth: 0, p: 1, textAlign: 'center', bgcolor: color, color: '#172027', borderRadius: 1 }}><Typography fontWeight={900}>{point.level}</Typography><Typography variant="caption" sx={{ fontSize: '0.62rem' }}>{point.phase}</Typography></Box>;
                })}
            </Box>
            <Alert severity="warning" sx={{ mt: 2 }}>
                {FWKO_OPERATING_REQUIREMENT.instruction} Report destination: {FWKO_OPERATING_REQUIREMENT.reportedTo}.
            </Alert>
        </Paper>

        <Box sx={{ mt: 3, mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={800}>{CPF_WATER_TREATMENT.processName}</Typography>
            <Typography variant="body2" color="text.secondary">From the FWKO produced-water outlet to the pond, the process removes remaining traces of crude before final water discharge.</Typography>
        </Box>
        <Alert severity="info" sx={{ mb: 2 }}>
            Recovered crude is returned to the main header and FWKO so crude treatment can continue; only treated water is discharged to the pond.
        </Alert>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="caption" fontWeight={800} color="text.secondary">PRODUCED-WATER ROUTE</Typography>
            <Stack direction={{ xs: 'column', lg: 'row' }} alignItems="center" justifyContent="center" gap={1}>
                <Chip icon={<WaterDrop />} label="FWKO water lines" color="info" variant="outlined" />
                <ArrowForward color="action" />
                <Chip icon={<Science />} label="Reverse demulsifier injection" color="secondary" variant="outlined" />
                <ArrowForward color="action" />
                <Chip label="CPI 1 · In service" color="success" />
                <ArrowForward color="action" />
                <Chip label="CPI 1 Goose Neck · Level indication" variant="outlined" />
                <ArrowForward color="action" />
                <Chip label="IGF" color="info" />
                <ArrowForward color="action" />
                <Chip label="Produced-water pond" variant="outlined" />
            </Stack>
            <Stack direction="row" justifyContent="center" flexWrap="wrap" useFlexGap gap={1} sx={{ mt: 2 }}>
                {CPF_WATER_TREATMENT.cpiUnits.map((unit) => <Chip key={unit.id} size="small" label={`${unit.name}: ${unit.status === 'IN_SERVICE' ? 'In service' : 'Standby'}`} color={unit.status === 'IN_SERVICE' ? 'success' : 'default'} variant="outlined" />)}
            </Stack>
            <Grid container spacing={1} sx={{ mt: 1 }}>
                {CPF_WATER_TREATMENT.cpiUnits.map((unit) => (
                    <Grid item xs={12} md={4} key={unit.gooseNeck.id}>
                        <Box sx={{ p: 1.25, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight={750}>{unit.name} Goose Neck</Typography>
                            <Typography variant="caption" color="text.secondary">Produced-water outlet · Shows CPI water level · Routes to IGF</Typography>
                        </Box>
                    </Grid>
                ))}
            </Grid>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>{CPF_WATER_TREATMENT.gravitySeparation}</Typography>
        </Paper>

        <Grid container spacing={2}>
            <Grid item xs={12} lg={6}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                    <Typography variant="caption" fontWeight={800} color="text.secondary">CPI CRUDE OUTLET</Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" gap={1} sx={{ mt: 1.5 }}>
                        <Chip label="CPI crude compartment" sx={{ bgcolor: '#f2c94c', color: '#29230d' }} />
                        <ArrowForward color="action" />
                        <Chip label="Dry Oil Sump Pump" variant="outlined" />
                        <ArrowForward color="action" />
                        <Chip label="Feed Pump" variant="outlined" />
                    </Stack>
                </Paper>
            </Grid>
            <Grid item xs={12} lg={6}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                    <Typography variant="caption" fontWeight={800} color="text.secondary">IGF FINAL SEPARATION</Typography>
                    <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                        <Chip icon={<Air />} label={CPF_WATER_TREATMENT.igfUnits[0].blower.name} color="info" variant="outlined" />
                        <Chip label="Water compartment" color="info" variant="outlined" />
                        <Chip label="Crude compartment" sx={{ bgcolor: '#f2c94c', color: '#29230d' }} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>{CPF_WATER_TREATMENT.igfUnits[0].blower.service}.</Typography>
                    <Stack direction="row" gap={1} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                        {CPF_WATER_TREATMENT.igfUnits.map((unit) => <Chip key={unit.id} label={`${unit.name}: ${unit.status === 'IN_SERVICE' ? 'In service' : 'Damaged'}`} color={unit.status === 'IN_SERVICE' ? 'success' : 'error'} size="small" />)}
                    </Stack>
                </Paper>
            </Grid>
            <Grid item xs={12}>
                <Alert severity="error">
                    IGF 2 is damaged and requires repair and maintenance before production can be stepped up.
                </Alert>
            </Grid>
            <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="caption" fontWeight={800} color="text.secondary">IGF RECOVERED-CRUDE RECYCLE</Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} alignItems="center" justifyContent="center" gap={1} sx={{ mt: 1.5 }}>
                        {CPF_WATER_TREATMENT.igfOilRecycle.map((item, index) => (
                            <React.Fragment key={item.id}>
                                {index > 0 && <ArrowForward color="action" />}
                                <Chip label={item.name} variant={index === 0 ? 'filled' : 'outlined'} />
                            </React.Fragment>
                        ))}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>{CPF_WATER_TREATMENT.treatmentOutcomes.recoveredCrude}.</Typography>
                </Paper>
            </Grid>
        </Grid>
    </Box>
);

export default SpocCpfProcess;
