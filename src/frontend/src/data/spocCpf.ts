export type CpfInstrumentType = 'PRESSURE_GAUGE' | 'TEMPERATURE_GAUGE' | 'TEMPERATURE_TRANSMITTER';

export interface CpfInstrumentRecord {
    id: string;
    type: CpfInstrumentType;
    service: string;
    signalDestination: 'LOCAL' | 'DCS';
}

export interface CpfInletRecord {
    id: string;
    source: 'OGM1' | 'OGM2' | 'OGM3' | 'OGM4' | 'OGM5' | 'OGM6' | 'OGM Mala';
    destination: 'CPF Main Header';
    instruments: CpfInstrumentRecord[];
    wellAssignmentStatus: 'ASSIGNED' | 'PENDING';
}

export type InterfacePhase = 'WATER' | 'EMULSION' | 'CRUDE';

export interface FwkoInterfacePoint {
    level: number;
    phase: InterfacePhase;
    operatorResponse: string;
}

const instrumentsFor = (lineId: string): CpfInstrumentRecord[] => [
    { id: `${lineId}-PG`, type: 'PRESSURE_GAUGE', service: 'Local inlet-line pressure indication', signalDestination: 'LOCAL' },
    { id: `${lineId}-TG`, type: 'TEMPERATURE_GAUGE', service: 'Local inlet-line temperature indication', signalDestination: 'LOCAL' },
    { id: `${lineId}-TT`, type: 'TEMPERATURE_TRANSMITTER', service: 'Remote inlet-line temperature signal', signalDestination: 'DCS' },
];

export const CPF_INLET_RECORDS: CpfInletRecord[] = [
    ...(['OGM1', 'OGM2', 'OGM3', 'OGM4', 'OGM5'] as const).map((source) => ({
        id: `CPF-INLET-${source.replace(' ', '-').toUpperCase()}`,
        source,
        destination: 'CPF Main Header' as const,
        instruments: instrumentsFor(source.replace(' ', '-').toUpperCase()),
        wellAssignmentStatus: 'ASSIGNED' as const,
    })),
    {
        id: 'CPF-INLET-OGM6', source: 'OGM6', destination: 'CPF Main Header',
        instruments: instrumentsFor('OGM6'), wellAssignmentStatus: 'PENDING',
    },
    {
        id: 'CPF-INLET-OGM-MALA', source: 'OGM Mala', destination: 'CPF Main Header',
        instruments: instrumentsFor('OGM-MALA'), wellAssignmentStatus: 'ASSIGNED',
    },
];

export const CPF_PROCESS_EQUIPMENT = {
    mainHeader: {
        id: 'CPF-MAIN-HEADER', name: 'CPF Main Header',
        service: 'Receives and combines production fluids from all OGM inlet lines',
    },
    fwkoTanks: [
        { id: 'CPF-FWKO-1', name: 'FWKO 1', type: 'Free Water Knock Out Tank', inletCount: 1, outlets: ['Water line', 'Crude line'] },
        { id: 'CPF-FWKO-2', name: 'FWKO 2', type: 'Free Water Knock Out Tank', inletCount: 1, outlets: ['Water line', 'Crude line'] },
    ],
} as const;

export const FWKO_INTERFACE_POINTS: FwkoInterfacePoint[] = Array.from({ length: 18 }, (_, index) => {
    const level = index + 1;
    if (level <= 8) return { level, phase: 'WATER', operatorResponse: 'Release water through the water outlet' };
    if (level <= 10) return { level, phase: 'EMULSION', operatorResponse: 'Hold and monitor the emulsion interface' };
    return { level, phase: 'CRUDE', operatorResponse: 'Maintain crude routing through the crude outlet' };
});

export const FWKO_OPERATING_REQUIREMENT = {
    readingsPerDay: 2,
    reportedTo: 'CPF Control Room',
    instruction: 'Operators take and report the interface reading from each FWKO twice every day.',
} as const;

export const CPF_WATER_TREATMENT = {
    source: 'FWKO water outlets',
    chemicalInjection: {
        chemical: 'Reverse demulsifier',
        location: 'Immediately downstream of each FWKO water outlet',
        purpose: 'Remove residual crude oil from produced water',
    },
    cpiUnits: [
        { id: 'CPF-CPI-1', name: 'CPI 1', status: 'IN_SERVICE' },
        { id: 'CPF-CPI-2', name: 'CPI 2', status: 'STANDBY' },
        { id: 'CPF-CPI-3', name: 'CPI 3', status: 'STANDBY' },
    ],
    oilRecovery: [
        { id: 'CPF-DRY-OIL-SUMP-PUMP', name: 'Dry Oil Sump Pump' },
        { id: 'CPF-FEED-PUMP', name: 'Feed Pump' },
    ],
} as const;
