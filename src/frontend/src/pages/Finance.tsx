import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert, Box, Button, Card, CardActionArea, CardContent, Chip, CircularProgress, Dialog,
    DialogActions, DialogContent, DialogTitle, Divider, FormControl, Grid, InputLabel, LinearProgress,
    MenuItem, Paper, Select, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import {
    AccountBalance, Add, AttachFile, CheckCircle, DeleteOutline, MonetizationOn, Payments, PendingActions,
    Refresh, Send, TrendingUp,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/auth';
import {
    BudgetStatus, FinanceEntryType, FinanceProject, ProjectBudget,
} from '../utils/finance';

type SetupKind = 'category' | 'funding-source' | 'period';
type DetailTab = 'allocations' | 'transactions' | 'documents' | 'workflow';
const labels = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const statusColor = (status: BudgetStatus | string) => status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'error' : status === 'SUBMITTED' ? 'warning' : status === 'CLOSED' ? 'default' : 'info';
const dateLabel = (value: string) => new Date(value).toLocaleDateString();
const initialBudget = { projectId: '', fiscalYear: new Date().getFullYear(), title: '', currency: 'USD', proposedAmount: '', notes: '' };
const initialSetup = { code: '', name: '', description: '', amount: '', reference: '', startDate: '', endDate: '' };
const initialEntry = { type: 'COMMITMENT' as FinanceEntryType, categoryId: '', periodId: '', description: '', reference: '', amount: '', transactionDate: '', counterparty: '', sourceCommitmentId: '' };
const initialDocument = { entryId: '', name: '', url: '', mimeType: 'application/pdf' };

const Finance: React.FC = () => {
    const { user } = useAuth();
    const [budgets, setBudgets] = useState<ProjectBudget[]>([]);
    const [projects, setProjects] = useState<FinanceProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState<DetailTab>('allocations');
    const [budgetOpen, setBudgetOpen] = useState(false);
    const [budgetForm, setBudgetForm] = useState(initialBudget);
    const [setupKind, setSetupKind] = useState<SetupKind | null>(null);
    const [setupForm, setSetupForm] = useState(initialSetup);
    const [entryOpen, setEntryOpen] = useState(false);
    const [entryForm, setEntryForm] = useState(initialEntry);
    const [documentOpen, setDocumentOpen] = useState(false);
    const [documentForm, setDocumentForm] = useState(initialDocument);
    const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);
    const [decisionComment, setDecisionComment] = useState('');
    const [saving, setSaving] = useState(false);

    const selected = budgets.find((budget) => budget.id === selectedId) || null;
    const canCreate = Boolean(user && ['ADMINISTRATOR', 'FINANCE_OFFICER', 'PROJECT_MANAGER', 'DEPARTMENT_HEAD'].includes(user.role));
    const reviewer = Boolean(user && ['ADMINISTRATOR', 'FINANCE_OFFICER'].includes(user.role));
    const canManage = Boolean(user && selected && (
        reviewer || user.role === 'DEPARTMENT_HEAD' || (user.role === 'PROJECT_MANAGER' && selected.project.managerId === user.id)
    ));

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [budgetResult, optionResult] = await Promise.all([
                apiRequest<{ budgets: ProjectBudget[] }>('/api/finance/budgets'),
                apiRequest<{ projects: FinanceProject[] }>('/api/finance/options'),
            ]);
            setBudgets(budgetResult.budgets);
            setProjects(optionResult.projects);
            setSelectedId((current) => current && budgetResult.budgets.some((item) => item.id === current)
                ? current : budgetResult.budgets[0]?.id || null);
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not load project finance'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        return !query ? budgets : budgets.filter((budget) =>
            [budget.title, budget.project.title, budget.project.code, budget.project.department, String(budget.fiscalYear)]
                .some((value) => value.toLowerCase().includes(query)));
    }, [budgets, search]);

    const mutate = async (path: string, options: RequestInit, success: string) => {
        setSaving(true);
        try { await apiRequest(path, options); await load(); toast.success(success); return true; }
        catch (error) { toast.error(error instanceof Error ? error.message : 'Finance operation failed'); return false; }
        finally { setSaving(false); }
    };

    const createBudget = async () => {
        const success = await mutate('/api/finance/budgets', { method: 'POST', body: JSON.stringify(budgetForm) }, 'Annual project budget created');
        if (success) { setBudgetOpen(false); setBudgetForm(initialBudget); }
    };

    const addSetup = async () => {
        if (!selected || !setupKind) return;
        let path = 'categories';
        let body: Record<string, unknown> = {};
        if (setupKind === 'category') body = { code: setupForm.code, name: setupForm.name, description: setupForm.description || null, proposedAmount: setupForm.amount };
        if (setupKind === 'funding-source') { path = 'funding-sources'; body = { name: setupForm.name, reference: setupForm.reference || null, amount: setupForm.amount, notes: setupForm.description || null }; }
        if (setupKind === 'period') { path = 'periods'; body = { name: setupForm.name, startDate: setupForm.startDate, endDate: setupForm.endDate }; }
        const success = await mutate(`/api/finance/budgets/${selected.id}/${path}`, { method: 'POST', body: JSON.stringify(body) }, `${labels(setupKind)} added`);
        if (success) { setSetupKind(null); setSetupForm(initialSetup); }
    };

    const addEntry = async () => {
        if (!selected) return;
        const body = { ...entryForm, periodId: entryForm.periodId || null, counterparty: entryForm.counterparty || null, sourceCommitmentId: entryForm.type === 'EXPENDITURE' && entryForm.sourceCommitmentId ? entryForm.sourceCommitmentId : null };
        const success = await mutate(`/api/finance/budgets/${selected.id}/entries`, { method: 'POST', body: JSON.stringify(body) }, `${labels(entryForm.type)} recorded as draft`);
        if (success) { setEntryOpen(false); setEntryForm(initialEntry); }
    };

    const addDocument = async () => {
        if (!selected) return;
        const success = await mutate(`/api/finance/budgets/${selected.id}/documents`, {
            method: 'POST', body: JSON.stringify({ ...documentForm, entryId: documentForm.entryId || null, mimeType: documentForm.mimeType || null }),
        }, 'Supporting document attached');
        if (success) { setDocumentOpen(false); setDocumentForm(initialDocument); }
    };

    const submitBudget = () => selected && mutate(`/api/finance/budgets/${selected.id}/submit`, { method: 'POST' }, 'Budget submitted for finance review');
    const removeSetup = (kind: SetupKind, id: string) => {
        if (!selected) return Promise.resolve(false);
        const path = kind === 'category' ? 'categories' : kind === 'funding-source' ? 'funding-sources' : 'periods';
        return mutate(`/api/finance/budgets/${selected.id}/${path}/${id}`, { method: 'DELETE' }, `${labels(kind)} removed`);
    };
    const closePeriod = (periodId: string) => selected
        ? mutate(`/api/finance/budgets/${selected.id}/periods/${periodId}`, { method: 'PATCH', body: JSON.stringify({ status: 'CLOSED' }) }, 'Reporting period closed')
        : Promise.resolve(false);
    const decideBudget = async () => {
        if (!selected || !decision) return;
        const success = await mutate(`/api/finance/budgets/${selected.id}/decision`, {
            method: 'POST', body: JSON.stringify({ decision, comment: decisionComment || null }),
        }, `Budget ${decision.toLowerCase()}`);
        if (success) { setDecision(null); setDecisionComment(''); }
    };
    const entryAction = (entryId: string, action: 'submit' | 'APPROVED' | 'REJECTED') => {
        if (!selected) return Promise.resolve(false);
        const isSubmit = action === 'submit';
        return mutate(`/api/finance/budgets/${selected.id}/entries/${entryId}/${isSubmit ? 'submit' : 'decision'}`, {
            method: 'POST', body: isSubmit ? undefined : JSON.stringify({ decision: action, comment: action === 'REJECTED' ? 'Returned for correction' : null }),
        }, isSubmit ? 'Finance entry submitted' : `Finance entry ${action.toLowerCase()}`);
    };

    return <Box sx={{ width: '100%' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}>
            <Box><Typography variant="h4" color="primary" fontWeight={800}>Budgeting & Finance</Typography><Typography color="text.secondary">Control annual project allocations, commitments, expenditure, periods, evidence, and approvals.</Typography></Box>
            <Stack direction="row" gap={1}><Button startIcon={<Refresh />} onClick={() => void load()}>Refresh</Button>{canCreate && <Button variant="contained" startIcon={<Add />} onClick={() => setBudgetOpen(true)}>New Annual Budget</Button>}</Stack>
        </Stack>
        <TextField fullWidth placeholder="Search budgets by project, code, department, title, or fiscal year" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ mb: 2 }} />
        {loading && budgets.length === 0 ? <Box sx={{ minHeight: 320, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : <Grid container spacing={2}>
            <Grid item xs={12} lg={4}><Stack spacing={1.5}>{filtered.length === 0 && <Alert severity="info">No annual project budgets match this search.</Alert>}{filtered.map((budget) => <Card key={budget.id} variant="outlined" sx={{ borderColor: budget.id === selectedId ? 'primary.main' : 'divider', borderWidth: budget.id === selectedId ? 2 : 1 }}><CardActionArea onClick={() => { setSelectedId(budget.id); setTab('allocations'); }}><CardContent>
                <Stack direction="row" justifyContent="space-between" gap={1}><Box><Typography fontWeight={800}>{budget.project.code} · FY{budget.fiscalYear}</Typography><Typography variant="body2">{budget.title}</Typography></Box><Chip size="small" color={statusColor(budget.status)} label={labels(budget.status)} /></Stack>
                <Typography variant="h6" color="primary" fontWeight={800} sx={{ mt: 1 }}>{formatMoney(budget.summary.approvedAllocation || budget.summary.proposedBudget, budget.currency)}</Typography>
                <LinearProgress variant="determinate" value={Math.min(budget.summary.percentageUtilized, 100)} color={budget.summary.percentageUtilized > 100 ? 'error' : 'primary'} sx={{ mt: 1, height: 7, borderRadius: 4 }} />
                <Typography variant="caption" color="text.secondary">{budget.summary.percentageUtilized}% utilized · {budget.project.department}</Typography>
            </CardContent></CardActionArea></Card>)}</Stack></Grid>
            <Grid item xs={12} lg={8}>{selected ? <BudgetWorkspace budget={selected} userId={user?.id || ''} canManage={canManage} reviewer={reviewer} tab={tab} setTab={setTab} setup={setSetupKind} removeSetup={removeSetup} closePeriod={closePeriod} addEntry={() => setEntryOpen(true)} addDocument={() => setDocumentOpen(true)} submit={() => void submitBudget()} decide={setDecision} entryAction={entryAction} /> : <Alert severity="info">Create or select an annual budget to open its finance workspace.</Alert>}</Grid>
        </Grid>}

        <Dialog open={budgetOpen} onClose={() => setBudgetOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Create annual project budget</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth required><InputLabel>Project</InputLabel><Select value={budgetForm.projectId} label="Project" onChange={(e) => setBudgetForm({ ...budgetForm, projectId: e.target.value })}>{projects.map((project) => <MenuItem key={project.id} value={project.id}>{project.code} · {project.title}</MenuItem>)}</Select></FormControl>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField label="Fiscal year" type="number" value={budgetForm.fiscalYear} onChange={(e) => setBudgetForm({ ...budgetForm, fiscalYear: Number(e.target.value) })} fullWidth required /><TextField label="Currency" value={budgetForm.currency} onChange={(e) => setBudgetForm({ ...budgetForm, currency: e.target.value.toUpperCase() })} inputProps={{ maxLength: 3 }} fullWidth required /></Stack>
            <TextField label="Budget title" value={budgetForm.title} onChange={(e) => setBudgetForm({ ...budgetForm, title: e.target.value })} fullWidth required />
            <TextField label="Proposed annual amount" type="number" value={budgetForm.proposedAmount} onChange={(e) => setBudgetForm({ ...budgetForm, proposedAmount: e.target.value })} inputProps={{ min: 0, step: .01 }} fullWidth required />
            <TextField label="Notes" value={budgetForm.notes} onChange={(e) => setBudgetForm({ ...budgetForm, notes: e.target.value })} multiline minRows={3} fullWidth />
        </Stack></DialogContent><DialogActions><Button onClick={() => setBudgetOpen(false)}>Cancel</Button><Button variant="contained" disabled={saving} onClick={() => void createBudget()}>Create Budget</Button></DialogActions></Dialog>

        <SetupDialog kind={setupKind} form={setupForm} setForm={setSetupForm} close={() => setSetupKind(null)} save={() => void addSetup()} saving={saving} />
        <EntryDialog open={entryOpen} budget={selected} form={entryForm} setForm={setEntryForm} close={() => setEntryOpen(false)} save={() => void addEntry()} saving={saving} />
        <DocumentDialog open={documentOpen} budget={selected} form={documentForm} setForm={setDocumentForm} close={() => setDocumentOpen(false)} save={() => void addDocument()} saving={saving} />
        <Dialog open={Boolean(decision)} onClose={() => setDecision(null)} fullWidth maxWidth="sm"><DialogTitle>{decision === 'APPROVED' ? 'Approve annual budget' : 'Reject annual budget'}</DialogTitle><DialogContent><Alert severity={decision === 'APPROVED' ? 'success' : 'warning'} sx={{ my: 1 }}>{decision === 'APPROVED' ? 'The proposed amount and category allocations will become the approved baseline.' : 'The budget will return to its owner for correction.'}</Alert><TextField label={decision === 'REJECTED' ? 'Rejection reason' : 'Review comment'} value={decisionComment} onChange={(e) => setDecisionComment(e.target.value)} multiline minRows={3} fullWidth required={decision === 'REJECTED'} /></DialogContent><DialogActions><Button onClick={() => setDecision(null)}>Cancel</Button><Button variant="contained" color={decision === 'APPROVED' ? 'success' : 'error'} disabled={saving || (decision === 'REJECTED' && !decisionComment.trim())} onClick={() => void decideBudget()}>{labels(decision || '')}</Button></DialogActions></Dialog>
    </Box>;
};

const BudgetWorkspace: React.FC<{
    budget: ProjectBudget; userId: string; canManage: boolean; reviewer: boolean; tab: DetailTab;
    setTab: (tab: DetailTab) => void; setup: (kind: SetupKind) => void; removeSetup: (kind: SetupKind, id: string) => Promise<boolean>; closePeriod: (id: string) => Promise<boolean>; addEntry: () => void; addDocument: () => void;
    submit: () => void; decide: (decision: 'APPROVED' | 'REJECTED') => void;
    entryAction: (entryId: string, action: 'submit' | 'APPROVED' | 'REJECTED') => Promise<boolean>;
}> = ({ budget, userId, canManage, reviewer, tab, setTab, setup, removeSetup, closePeriod, addEntry, addDocument, submit, decide, entryAction }) => {
    const draft = budget.status === 'DRAFT' || budget.status === 'REJECTED';
    const submitted = budget.status === 'SUBMITTED';
    const approved = budget.status === 'APPROVED';
    const metrics = [
        ['Approved allocation', budget.summary.approvedAllocation, <AccountBalance />], ['Actual expenditure', budget.summary.actualExpenditure, <Payments />],
        ['Outstanding commitments', budget.summary.commitments, <PendingActions />], ['Remaining balance', budget.summary.remainingBalance, <MonetizationOn />],
        ['Variance', budget.summary.variance, <TrendingUp />], ['Utilized', budget.summary.percentageUtilized, <CheckCircle />],
    ] as const;
    return <Card variant="outlined"><CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}><Box><Typography variant="h5" fontWeight={800}>{budget.title}</Typography><Typography color="text.secondary">{budget.project.code} · {budget.project.title} · FY{budget.fiscalYear}</Typography></Box><Stack direction="row" gap={1} flexWrap="wrap"><Chip color={statusColor(budget.status)} label={labels(budget.status)} />{draft && canManage && <Button size="small" variant="contained" startIcon={<Send />} onClick={submit}>Submit</Button>}{submitted && reviewer && budget.submittedById !== userId && <><Button size="small" color="error" onClick={() => decide('REJECTED')}>Reject</Button><Button size="small" variant="contained" color="success" onClick={() => decide('APPROVED')}>Approve</Button></>}{approved && canManage && <Button size="small" variant="contained" startIcon={<Add />} onClick={addEntry}>Finance Entry</Button>} {canManage && <Button size="small" startIcon={<AttachFile />} onClick={addDocument}>Document</Button>}</Stack></Stack>
        {budget.reviewComment && <Alert severity={budget.status === 'REJECTED' ? 'error' : 'info'} sx={{ mt: 2 }}>{budget.reviewComment}</Alert>}
        <Grid container spacing={1.5} sx={{ my: 1 }}>{metrics.map(([label, value, icon]) => <Grid item xs={6} md={4} key={label}><Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}><Stack direction="row" gap={1} alignItems="center">{icon}<Box><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={800}>{label === 'Utilized' ? `${value}%` : formatMoney(value, budget.currency)}</Typography></Box></Stack></Paper></Grid>)}</Grid>
        <LinearProgress variant="determinate" value={Math.min(budget.summary.percentageUtilized, 100)} color={budget.summary.percentageUtilized > 100 ? 'error' : 'primary'} sx={{ height: 9, borderRadius: 5, mb: 2 }} />
        <Tabs value={tab} onChange={(_event, value: DetailTab) => setTab(value)} variant="scrollable"><Tab value="allocations" label="Allocations & periods" /><Tab value="transactions" label={`Commitments & expenditure (${budget.entries.length})`} /><Tab value="documents" label={`Documents (${budget.documents.length + budget.entries.reduce((count, item) => count + item.documents.length, 0)})`} /><Tab value="workflow" label="Approval history" /></Tabs><Divider sx={{ mb: 2 }} />
        {tab === 'allocations' && <Allocations budget={budget} editable={draft && canManage} reviewer={reviewer} setup={setup} remove={removeSetup} closePeriod={closePeriod} />}
        {tab === 'transactions' && <Transactions budget={budget} userId={userId} reviewer={reviewer} action={entryAction} />}
        {tab === 'documents' && <Documents budget={budget} />}
        {tab === 'workflow' && <Workflow budget={budget} />}
    </CardContent></Card>;
};

const Allocations: React.FC<{ budget: ProjectBudget; editable: boolean; reviewer: boolean; setup: (kind: SetupKind) => void; remove: (kind: SetupKind, id: string) => Promise<boolean>; closePeriod: (id: string) => Promise<boolean> }> = ({ budget, editable, reviewer, setup, remove, closePeriod }) => <Stack spacing={2}>
    <Section title="Budget categories" action={editable ? <Button size="small" startIcon={<Add />} onClick={() => setup('category')}>Category</Button> : undefined}>{budget.categories.length === 0 ? <Alert severity="warning">At least one category is required before submission.</Alert> : budget.categories.map((item) => <Row key={item.id} primary={`${item.code} · ${item.name}`} secondary={`Proposed ${formatMoney(item.proposedAmount, budget.currency)} · Approved ${formatMoney(item.approvedAmount, budget.currency)}`} action={editable ? <Button size="small" color="error" startIcon={<DeleteOutline />} onClick={() => void remove('category', item.id)}>Remove</Button> : undefined} />)}</Section>
    <Section title="Funding sources" action={editable ? <Button size="small" startIcon={<Add />} onClick={() => setup('funding-source')}>Funding source</Button> : undefined}>{budget.fundingSources.length === 0 ? <Typography color="text.secondary" variant="body2">No funding-source breakdown recorded.</Typography> : budget.fundingSources.map((item) => <Row key={item.id} primary={item.name} secondary={`${formatMoney(item.amount, budget.currency)}${item.reference ? ` · ${item.reference}` : ''}`} action={editable ? <Button size="small" color="error" startIcon={<DeleteOutline />} onClick={() => void remove('funding-source', item.id)}>Remove</Button> : undefined} />)}</Section>
    <Section title="Financial reporting periods" action={(editable || reviewer) ? <Button size="small" startIcon={<Add />} onClick={() => setup('period')}>Period</Button> : undefined}>{budget.periods.length === 0 ? <Alert severity="warning">At least one reporting period is required before submission.</Alert> : budget.periods.map((item) => <Row key={item.id} primary={item.name} secondary={`${dateLabel(item.startDate)} – ${dateLabel(item.endDate)} · ${labels(item.status)}`} action={editable ? <Button size="small" color="error" startIcon={<DeleteOutline />} onClick={() => void remove('period', item.id)}>Remove</Button> : reviewer && item.status === 'OPEN' ? <Button size="small" onClick={() => void closePeriod(item.id)}>Close period</Button> : undefined} />)}</Section>
</Stack>;

const Transactions: React.FC<{ budget: ProjectBudget; userId: string; reviewer: boolean; action: (id: string, action: 'submit' | 'APPROVED' | 'REJECTED') => Promise<boolean> }> = ({ budget, userId, reviewer, action }) => budget.entries.length === 0 ? <Alert severity="info">No commitments or expenditures have been recorded.</Alert> : <Stack spacing={1}>{budget.entries.map((entry) => <Paper key={entry.id} variant="outlined" sx={{ p: 1.5 }}><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}><Box><Stack direction="row" gap={1} alignItems="center"><Chip size="small" variant="outlined" label={labels(entry.type)} /><Typography fontWeight={800}>{entry.reference} · {entry.description}</Typography></Stack><Typography variant="body2" color="text.secondary">{entry.category.code} · {dateLabel(entry.transactionDate)}{entry.counterparty ? ` · ${entry.counterparty}` : ''} · entered by {entry.createdBy.name}</Typography>{entry.reviewComment && <Typography variant="caption" color="error">{entry.reviewComment}</Typography>}</Box><Stack direction="row" gap={1} alignItems="center"><Typography fontWeight={800}>{formatMoney(entry.amount, budget.currency)}</Typography><Chip size="small" color={statusColor(entry.status)} label={labels(entry.status)} />{(entry.status === 'DRAFT' || entry.status === 'REJECTED') && entry.createdById === userId && <Button size="small" onClick={() => void action(entry.id, 'submit')}>Submit</Button>}{entry.status === 'SUBMITTED' && reviewer && entry.createdById !== userId && <><Button size="small" color="error" onClick={() => void action(entry.id, 'REJECTED')}>Reject</Button><Button size="small" color="success" onClick={() => void action(entry.id, 'APPROVED')}>Approve</Button></>}</Stack></Stack></Paper>)}</Stack>;

const Documents: React.FC<{ budget: ProjectBudget }> = ({ budget }) => {
    const documents = [...budget.documents, ...budget.entries.flatMap((entry) => entry.documents.map((document) => ({ ...document, entryReference: entry.reference })))];
    return documents.length === 0 ? <Alert severity="info">No supporting documents have been attached.</Alert> : <Stack spacing={1}>{documents.map((document) => <Paper key={document.id} variant="outlined" sx={{ p: 1.5 }}><Stack direction="row" justifyContent="space-between"><Box><Typography fontWeight={700}>{document.name}</Typography><Typography variant="caption" color="text.secondary">{'entryReference' in document ? `Entry ${document.entryReference} · ` : ''}{document.mimeType || 'Linked document'}</Typography></Box><Button component="a" href={document.url} target="_blank" rel="noopener noreferrer">Open</Button></Stack></Paper>)}</Stack>;
};
const Workflow: React.FC<{ budget: ProjectBudget }> = ({ budget }) => budget.approvals.length === 0 ? <Alert severity="info">This budget has not entered an approval workflow.</Alert> : <Stack spacing={1}>{budget.approvals.map((item) => <Row key={item.id} primary={`${labels(item.action)} by ${item.actor.name}`} secondary={`${new Date(item.createdAt).toLocaleString()}${item.comment ? ` · ${item.comment}` : ''}`} />)}</Stack>;
const Section: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, action, children }) => <Box><Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}><Typography variant="h6">{title}</Typography>{action}</Stack>{children}</Box>;
const Row: React.FC<{ primary: string; secondary: string; action?: React.ReactNode }> = ({ primary, secondary, action }) => <Paper variant="outlined" sx={{ p: 1.25, mb: 1 }}><Stack direction="row" justifyContent="space-between" gap={1}><Box><Typography variant="body2" fontWeight={700}>{primary}</Typography><Typography variant="caption" color="text.secondary">{secondary}</Typography></Box>{action}</Stack></Paper>;

const SetupDialog: React.FC<{ kind: SetupKind | null; form: typeof initialSetup; setForm: React.Dispatch<React.SetStateAction<typeof initialSetup>>; close: () => void; save: () => void; saving: boolean }> = ({ kind, form, setForm, close, save, saving }) => <Dialog open={Boolean(kind)} onClose={close} fullWidth maxWidth="sm"><DialogTitle>Add {kind ? labels(kind) : ''}</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}>{kind === 'category' && <TextField label="Category code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />}{kind && <TextField label={kind === 'period' ? 'Period name' : 'Name'} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />}{kind !== 'period' && <TextField label="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} inputProps={{ min: 0, step: .01 }} required />}{kind === 'funding-source' && <TextField label="Funding reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />}{kind !== 'period' && <TextField label="Description / notes" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline minRows={2} />}{kind === 'period' && <><TextField type="date" label="Start date" InputLabelProps={{ shrink: true }} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /><TextField type="date" label="End date" InputLabelProps={{ shrink: true }} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></>}</Stack></DialogContent><DialogActions><Button onClick={close}>Cancel</Button><Button variant="contained" disabled={saving} onClick={save}>Add</Button></DialogActions></Dialog>;

const EntryDialog: React.FC<{ open: boolean; budget: ProjectBudget | null; form: typeof initialEntry; setForm: React.Dispatch<React.SetStateAction<typeof initialEntry>>; close: () => void; save: () => void; saving: boolean }> = ({ open, budget, form, setForm, close, save, saving }) => <Dialog open={open} onClose={close} fullWidth maxWidth="sm"><DialogTitle>Record commitment or expenditure</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}><FormControl fullWidth><InputLabel>Entry type</InputLabel><Select value={form.type} label="Entry type" onChange={(e) => setForm({ ...form, type: e.target.value as FinanceEntryType, sourceCommitmentId: '' })}><MenuItem value="COMMITMENT">Commitment</MenuItem><MenuItem value="EXPENDITURE">Expenditure</MenuItem></Select></FormControl><FormControl fullWidth required><InputLabel>Budget category</InputLabel><Select value={form.categoryId} label="Budget category" onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{budget?.categories.map((item) => <MenuItem key={item.id} value={item.id}>{item.code} · {item.name}</MenuItem>)}</Select></FormControl><FormControl fullWidth><InputLabel>Reporting period</InputLabel><Select value={form.periodId} label="Reporting period" onChange={(e) => setForm({ ...form, periodId: e.target.value })}><MenuItem value=""><em>Not assigned</em></MenuItem>{budget?.periods.filter((item) => item.status === 'OPEN').map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</Select></FormControl>{form.type === 'EXPENDITURE' && <FormControl fullWidth><InputLabel>Source commitment</InputLabel><Select value={form.sourceCommitmentId} label="Source commitment" onChange={(e) => setForm({ ...form, sourceCommitmentId: e.target.value })}><MenuItem value=""><em>Direct expenditure</em></MenuItem>{budget?.entries.filter((item) => item.type === 'COMMITMENT' && item.status === 'APPROVED' && (!form.categoryId || item.categoryId === form.categoryId)).map((item) => <MenuItem key={item.id} value={item.id}>{item.reference} · {item.description}</MenuItem>)}</Select></FormControl>}<TextField label="Reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} required /><TextField label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /><TextField label="Amount" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} inputProps={{ min: .01, step: .01 }} required /><TextField type="date" label="Transaction date" InputLabelProps={{ shrink: true }} value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} required /><TextField label="Supplier / payee" value={form.counterparty} onChange={(e) => setForm({ ...form, counterparty: e.target.value })} /></Stack></DialogContent><DialogActions><Button onClick={close}>Cancel</Button><Button variant="contained" disabled={saving} onClick={save}>Save Draft</Button></DialogActions></Dialog>;

const DocumentDialog: React.FC<{ open: boolean; budget: ProjectBudget | null; form: typeof initialDocument; setForm: React.Dispatch<React.SetStateAction<typeof initialDocument>>; close: () => void; save: () => void; saving: boolean }> = ({ open, budget, form, setForm, close, save, saving }) => <Dialog open={open} onClose={close} fullWidth maxWidth="sm"><DialogTitle>Attach supporting document</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}><TextField label="Document name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><TextField label="Secure document URL" type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} helperText="Use an approved document repository URL; files are not stored in the browser." required /><TextField label="MIME type" value={form.mimeType} onChange={(e) => setForm({ ...form, mimeType: e.target.value })} /><FormControl fullWidth><InputLabel>Related finance entry</InputLabel><Select value={form.entryId} label="Related finance entry" onChange={(e) => setForm({ ...form, entryId: e.target.value })}><MenuItem value=""><em>Budget-level document</em></MenuItem>{budget?.entries.map((entry) => <MenuItem key={entry.id} value={entry.id}>{entry.reference} · {entry.description}</MenuItem>)}</Select></FormControl></Stack></DialogContent><DialogActions><Button onClick={close}>Cancel</Button><Button variant="contained" disabled={saving} onClick={save}>Attach</Button></DialogActions></Dialog>;

const formatMoney = (value: number | string, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value));
export default Finance;
