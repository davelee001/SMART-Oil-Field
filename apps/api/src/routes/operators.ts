import { Router } from 'express';
import { OperatorScope } from '@smart-oil-field/shared';
import { requireOperatorScope } from '../auth';

const router = Router();
const workspaces: Record<OperatorScope, { operator: OperatorScope; basin: string; base: string }> = {
  SPOC: { operator: 'SPOC', basin: 'Tharjaath Basin', base: 'Tharjaath' },
  DPOC: { operator: 'DPOC', basin: 'Paloch Basin', base: 'Paloch' },
  GPOC: { operator: 'GPOC', basin: 'Unity Basin', base: 'Unity' },
};

for (const scope of Object.keys(workspaces) as OperatorScope[]) {
  router.get(`/${scope.toLowerCase()}`, ...requireOperatorScope(scope), (_req, res) => {
    res.json({ workspace: workspaces[scope] });
  });
}

export default router;
