import { OperatorScope } from '../utils/auth';

export interface OperatorWorkspaceDefinition {
    scope: OperatorScope;
    shortName: string;
    name: string;
    basin: string;
    base: string;
    color: string;
    foreground: string;
    route: string;
}

export const OPERATOR_WORKSPACES: Record<OperatorScope, OperatorWorkspaceDefinition> = {
    SPOC: {
        scope: 'SPOC', shortName: 'SPOC', name: 'Sudd Petroleum Operating Company',
        basin: 'Tharjaath Basin', base: 'Tharjaath', color: '#f2c94c', foreground: '#29230d', route: '/operations/spoc',
    },
    DPOC: {
        scope: 'DPOC', shortName: 'DPOC', name: 'Dar Petroleum Operating Company',
        basin: 'Paloch Basin', base: 'Paloch', color: '#9aa3aa', foreground: '#172027', route: '/operations/dpoc',
    },
    GPOC: {
        scope: 'GPOC', shortName: 'GPOC', name: 'Greater Pioneer Petroleum Operating Company',
        basin: 'Unity Basin', base: 'Unity', color: '#8ecae6', foreground: '#103044', route: '/operations/gpoc',
    },
};

export const operatorPath = (scope: OperatorScope) => OPERATOR_WORKSPACES[scope].route;
