export type PumpType = 'PCP' | 'ESP';

export interface OilWell {
    id: string;
    name: string;
    field: 'Tharjaath Oil Field' | 'Mala Oil Field';
    block: 'Block 5A';
    pumpType: PumpType;
    manifold: string;
    cpf: 'Tharjaath CPF';
    location: string;
    position: [number, number];
    status: 'active' | 'warning' | 'error' | 'inactive';
    production: number;
    temperature: number;
    pressure: number;
    lastUpdated: number;
}

interface WellSpec { number: number; pumpType: PumpType; manifold: string; }

const THARJAATH_CENTER: [number, number] = [8.4665, 30.3167];
const MALA_CENTER: [number, number] = [8.43, 30.36];
const THARJAATH_WELLS: WellSpec[] = [
    { number: 15, pumpType: 'PCP', manifold: 'OGM3' },
    { number: 14, pumpType: 'PCP', manifold: 'OGM3' },
    { number: 13, pumpType: 'ESP', manifold: 'OGM3' },
    { number: 12, pumpType: 'PCP', manifold: 'OGM2' },
    { number: 11, pumpType: 'PCP', manifold: 'OGM2' },
    { number: 10, pumpType: 'PCP', manifold: 'OGM2' },
    { number: 9, pumpType: 'PCP', manifold: 'OGM2' },
    { number: 8, pumpType: 'ESP', manifold: 'OGM2' },
    { number: 7, pumpType: 'PCP', manifold: 'OGM2' },
    { number: 6, pumpType: 'PCP', manifold: 'OGM1' },
    { number: 5, pumpType: 'PCP', manifold: 'OGM1' },
    { number: 4, pumpType: 'ESP', manifold: 'OGM1' },
    { number: 3, pumpType: 'ESP', manifold: 'OGM1' },
    { number: 2, pumpType: 'PCP', manifold: 'OGM1' },
    { number: 1, pumpType: 'PCP', manifold: 'OGM1' },
];
const MALA_WELLS: WellSpec[] = [];

const positionAround = (center: [number, number], index: number): [number, number] => {
    const angle = index * 2.399963;
    const radius = 0.0035 + Math.floor(index / 8) * 0.0025;
    return [center[0] + Math.sin(angle) * radius, center[1] + Math.cos(angle) * radius];
};

const buildWells = (specs: WellSpec[], field: OilWell['field'], pcpPrefix: string,
    espPrefix: string, center: [number, number]): OilWell[] => specs.map((spec, index) => {
    const name = `${spec.pumpType === 'ESP' ? espPrefix : pcpPrefix}${spec.number}`;
    return {
        id: name.toLowerCase(), name, field, block: 'Block 5A', pumpType: spec.pumpType,
        manifold: spec.manifold, cpf: 'Tharjaath CPF', location: `${field} / ${spec.manifold}`,
        position: positionAround(center, index), status: 'inactive', production: 0,
        temperature: 0, pressure: 0, lastUpdated: 0,
    };
});

export const OIL_WELLS: OilWell[] = [
    ...buildWells(THARJAATH_WELLS, 'Tharjaath Oil Field', 'TJ', 'TJH', THARJAATH_CENTER),
    ...buildWells(MALA_WELLS, 'Mala Oil Field', 'ML', 'MLH', MALA_CENTER),
];

export const FIELD_SUMMARY = [
    { field: 'Tharjaath Oil Field', wellCount: 28, manifoldCount: 5, cpf: 'Tharjaath CPF' },
    { field: 'Mala Oil Field', wellCount: 27, manifoldCount: 1, cpf: 'Tharjaath CPF' },
] as const;
