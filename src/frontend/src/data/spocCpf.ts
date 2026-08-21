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

export const CPF_TREATMENT_PROCESSES = [
    {
        id: 'CPF-PRODUCED-WATER-TREATMENT',
        name: 'Produced Water Treatment',
        status: 'RECORDED',
        description: 'Removes crude traces from produced water through CPI and IGF separation before pond discharge.',
    },
    {
        id: 'CPF-CRUDE-OIL-TREATMENT',
        name: 'Crude Oil Treatment',
        status: 'AWAITING_DETAILS',
        description: 'Receives crude separated at the FWKO and recovered crude returned from the produced-water treatment process.',
    },
] as const;

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
        { id: 'CPF-FWKO-1', name: 'FWKO 1', type: 'Free Water Knock Out Tank', inletCount: 1, outlets: ['Produced-water line', 'Crude line', 'Gas outlet'], compartments: [{ name: 'Outer tank', phase: 'Water' }, { name: 'Inner tank', phase: 'Crude' }] },
        { id: 'CPF-FWKO-2', name: 'FWKO 2', type: 'Free Water Knock Out Tank', inletCount: 1, outlets: ['Produced-water line', 'Crude line', 'Gas outlet'], compartments: [{ name: 'Outer tank', phase: 'Water' }, { name: 'Inner tank', phase: 'Crude' }] },
    ],
    fwkoSeparation: {
        phases: ['Water', 'Crude', 'Gas'],
        gasHandling: {
            source: 'Top of each FWKO',
            action: 'Degassed through the gas outlet',
            destination: 'Flare Knock Out Drum',
            finalDisposition: 'Flared through controlled combustion',
            purpose: 'Prevent direct release of unprocessed hydrocarbon gas and reduce atmospheric pollution risk',
        },
    },
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
    processName: 'Produced Water Treatment',
    boundary: 'FWKO produced-water outlet to produced-water discharge pond',
    objective: 'Remove remaining traces of crude oil from produced water before final pond discharge',
    source: 'FWKO water outlets',
    chemicalInjection: {
        chemical: 'Reverse demulsifier',
        location: 'Immediately downstream of each FWKO water outlet',
        purpose: 'Remove residual crude oil from produced water',
    },
    cpiUnits: [
        { id: 'CPF-CPI-1', name: 'CPI 1', status: 'IN_SERVICE', compartments: ['Water compartment', 'Crude compartment'], outlets: ['Goose Neck produced-water outlet', 'Crude line'], gooseNeck: { id: 'CPF-CPI-1-GOOSE-NECK', indicates: 'CPI produced-water level', destination: 'IGF' } },
        { id: 'CPF-CPI-2', name: 'CPI 2', status: 'STANDBY', compartments: ['Water compartment', 'Crude compartment'], outlets: ['Goose Neck produced-water outlet', 'Crude line'], gooseNeck: { id: 'CPF-CPI-2-GOOSE-NECK', indicates: 'CPI produced-water level', destination: 'IGF' } },
        { id: 'CPF-CPI-3', name: 'CPI 3', status: 'STANDBY', compartments: ['Water compartment', 'Crude compartment'], outlets: ['Goose Neck produced-water outlet', 'Crude line'], gooseNeck: { id: 'CPF-CPI-3-GOOSE-NECK', indicates: 'CPI produced-water level', destination: 'IGF' } },
    ],
    gravitySeparation: 'Water settles in the lower water compartment while lower-density crude floats and passes into the crude compartment.',
    oilRecovery: [
        { id: 'CPF-DRY-OIL-SUMP-PUMP', name: 'Dry Oil Sump Pump' },
        { id: 'CPF-FEED-PUMP', name: 'Feed Pump' },
    ],
    igfUnits: [
        {
            id: 'CPF-IGF-1', name: 'IGF 1', type: 'Induced Gas Flotation', status: 'IN_SERVICE',
            compartments: ['Water compartment', 'Crude compartment'],
            blower: { id: 'CPF-IGF-1-BLOWER', name: 'IGF 1 Blower', service: 'Aids final crude removal from the water compartment into the crude compartment' },
            outlets: ['Treated-water line', 'Recovered-crude line'], maintenanceRequirement: null,
        },
        {
            id: 'CPF-IGF-2', name: 'IGF 2', type: 'Induced Gas Flotation', status: 'DAMAGED',
            compartments: ['Water compartment', 'Crude compartment'],
            blower: { id: 'CPF-IGF-2-BLOWER', name: 'IGF 2 Blower', service: 'Unavailable while the unit is damaged' },
            outlets: ['Treated-water line', 'Recovered-crude line'],
            maintenanceRequirement: 'Repair and maintenance required before production can be stepped up',
        },
    ],
    igfOilRecycle: [
        { id: 'CPF-IGF-PIT', name: 'IGF Pit' },
        { id: 'CPF-IGF-PIT-PUMP', name: 'IGF Pit Pump' },
        { id: 'CPF-MAIN-HEADER', name: 'CPF Main Header' },
        { id: 'CPF-FWKO-RETURN', name: 'FWKO re-separation' },
    ],
    finalWaterDischarge: { id: 'CPF-PRODUCED-WATER-POND', name: 'Produced-water discharge pond' },
    treatmentOutcomes: {
        treatedWater: 'Discharged from the IGF water compartment to the produced-water pond',
        recoveredCrude: 'Recycled from the CPI and IGF crude compartments to the main header and FWKO for continued crude treatment',
    },
} as const;
