import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
    DialogTitle, FormControl, Grid, InputLabel, LinearProgress, MenuItem, Paper, Select, Stack, Tab, Tabs,
    TextField, Typography,
} from '@mui/material';
import {
    Add, Assessment, AttachFile, AutoGraph, FactCheck, Flag, Refresh, Speed, Timeline, WarningAmber,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/auth';
import {
    KpiCreateKind, KpiEvent, KpiIndicator, KpiOptions, KpiPeriod, KpiRegister, KpiSummary, KpiTab,
    ResultsFramework,
} from '../utils/kpis';

const label = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateLabel = (value: string) => new Date(value).toLocaleDateString();
const chipColor = (status: string) => ['ACTIVE', 'APPROVED', 'VERIFIED', 'ON_TRACK'].includes(status) ? 'success' : ['REJECTED', 'OFF_TRACK', 'CLOSED'].includes(status) ? 'error' : ['AT_RISK', 'SUBMITTED', 'OVERDUE'].includes(status) ? 'warning' : 'default';
const emptySummary: KpiSummary = { frameworks: 0, activeIndicators: 0, openPeriods: 0, overduePeriods: 0, pendingVerification: 0, reportingRate: 0, portfolioScore: 0, onTrack: 0, atRisk: 0, offTrack: 0, notReported: 0 };
const emptyOptions: KpiOptions = { users: [], projects: [], frameworks: [], indicators: [], periods: [] };
const initialForm = {
    frameworkId: '', projectId: '', ownerId: '', code: '', name: '', description: '', startDate: '', endDate: '', dueDate: '', status: '',
    parentId: '', resultLevelId: '', type: 'OUTCOME', sortOrder: '0', unit: '', dataType: 'NUMBER', direction: 'INCREASE', frequency: 'QUARTERLY',
    baselineValue: '', baselineDate: '', finalTargetValue: '', weight: '1', tolerance: '0', disaggregation: '', formula: '', sourceDescription: '',
    indicatorId: '', periodId: '', targetValue: '', actualValue: '', measuredAt: '', narrative: '', sourceType: 'MANUAL', sourceReference: '',
    endpoint: '/api/telemetry/stats', valuePath: 'avg_temperature', aggregation: 'VALUE',
};
const initialEvidence = { kind: 'measurementId', recordId: '', name: '', url: '', mimeType: 'application/pdf', notes: '' };

const KpiPerformance: React.FC = () => {
    const { user } = useAuth();
    const [register, setRegister] = useState<KpiRegister>({ frameworks: [], events: [] });
    const [summary, setSummary] = useState(emptySummary);
    const [options, setOptions] = useState(emptyOptions);
    const [selectedFramework, setSelectedFramework] = useState('');
    const [tab, setTab] = useState<KpiTab>('frameworks');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [createKind, setCreateKind] = useState<KpiCreateKind | null>(null);
    const [form, setForm] = useState(initialForm);
    const [evidenceOpen, setEvidenceOpen] = useState(false);
    const [evidence, setEvidence] = useState(initialEvidence);
    const manager = Boolean(user && ['ADMINISTRATOR', 'ME_OFFICER'].includes(user.role));
    const contributor = Boolean(user && ['ADMINISTRATOR', 'ME_OFFICER', 'PROJECT_MANAGER', 'DEPARTMENT_HEAD'].includes(user.role));

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const query = selectedFramework ? `?frameworkId=${selectedFramework}` : '';
            const [data, overview, optionData] = await Promise.all([
                apiRequest<KpiRegister>('/api/kpis/register'), apiRequest<{ summary: KpiSummary }>(`/api/kpis/overview${query}`), apiRequest<KpiOptions>('/api/kpis/options'),
            ]);
            setRegister(data); setSummary(overview.summary); setOptions(optionData);
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not load KPI performance'); }
        finally { setLoading(false); }
    }, [selectedFramework]);
    useEffect(() => { void load(); }, [load]);

    const mutate = async (path: string, request: RequestInit, success: string) => {
        setSaving(true);
        try { await apiRequest(path, request); await load(); toast.success(success); return true; }
        catch (error) { toast.error(error instanceof Error ? error.message : 'KPI operation failed'); return false; }
        finally { setSaving(false); }
    };
    const openCreate = (kind: KpiCreateKind, values: Partial<typeof initialForm> = {}) => { setCreateKind(kind); setForm({ ...initialForm, frameworkId: selectedFramework, ...values }); };
    const create = async () => {
        if (!createKind) return;
        let path = `/${createKind}s`; let method = 'POST'; let body: Record<string, unknown> = {};
        if (createKind === 'framework') body = { projectId: form.projectId, code: form.code, name: form.name, description: form.description || null, startDate: form.startDate, endDate: form.endDate, status: 'ACTIVE', ownerId: form.ownerId };
        if (createKind === 'result') { path = `/frameworks/${form.frameworkId}/results`; body = { parentId: form.parentId || null, code: form.code, type: form.type, title: form.name, description: form.description || null, sortOrder: Number(form.sortOrder) }; }
        if (createKind === 'indicator') body = { frameworkId: form.frameworkId, resultLevelId: form.resultLevelId || null, code: form.code, name: form.name, description: form.description, unit: form.unit, dataType: form.dataType, direction: form.direction, frequency: form.frequency, baselineValue: Number(form.baselineValue), baselineDate: form.baselineDate, finalTargetValue: Number(form.finalTargetValue), weight: Number(form.weight), tolerance: Number(form.tolerance), disaggregation: form.disaggregation ? form.disaggregation.split(',').map((item) => item.trim()).filter(Boolean) : null, formula: form.formula || null, sourceDescription: form.sourceDescription || null, status: 'ACTIVE', ownerId: form.ownerId };
        if (createKind === 'period') body = { frameworkId: form.frameworkId, name: form.name, startDate: form.startDate, endDate: form.endDate, dueDate: form.dueDate };
        if (createKind === 'target') { path = '/targets'; method = 'PUT'; body = { indicatorId: form.indicatorId, periodId: form.periodId, targetValue: Number(form.targetValue), notes: form.description || null }; }
        if (createKind === 'measurement') body = { indicatorId: form.indicatorId, periodId: form.periodId, actualValue: Number(form.actualValue), measuredAt: form.measuredAt, narrative: form.narrative || null, sourceType: 'MANUAL', sourceReference: form.sourceReference || null };
        if (createKind === 'source') { path = '/data-sources'; body = { indicatorId: form.indicatorId, name: form.name, sourceType: form.sourceType, endpoint: form.endpoint, valuePath: form.valuePath, aggregation: form.aggregation }; }
        const ok = await mutate(`/api/kpis${path}`, { method, body: JSON.stringify(body) }, `${label(createKind)} created`);
        if (ok) setCreateKind(null);
    };
    const act = (path: string, body: Record<string, unknown>, success: string) => mutate(`/api/kpis${path}`, { method: 'POST', body: JSON.stringify(body) }, success);
    const attachEvidence = async () => {
        const ok = await mutate('/api/kpis/evidence', { method: 'POST', body: JSON.stringify({ [evidence.kind]: evidence.recordId, name: evidence.name, url: evidence.url, mimeType: evidence.mimeType || null, notes: evidence.notes || null }) }, 'KPI evidence attached');
        if (ok) { setEvidenceOpen(false); setEvidence(initialEvidence); }
    };
    const frameworks = selectedFramework ? register.frameworks.filter((item) => item.id === selectedFramework) : register.frameworks;
    const indicators = frameworks.flatMap((item) => item.indicators);
    const periods = frameworks.flatMap((item) => item.periods);
    const query = search.trim().toLowerCase();
    const matches = (...values: unknown[]) => !query || values.some((value) => String(value || '').toLowerCase().includes(query));
    const cards = [
        ['Portfolio score', `${summary.portfolioScore}%`, <Speed />], ['Reporting rate', `${summary.reportingRate}%`, <Assessment />],
        ['Active KPIs', summary.activeIndicators, <Flag />], ['On track', summary.onTrack, <FactCheck />], ['At risk', summary.atRisk, <WarningAmber />], ['Off track', summary.offTrack, <Timeline />],
    ] as const;

    return <Box sx={{ width: '100%' }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}><Box><Typography variant="h4" color="primary" fontWeight={800}>KPI & Performance Management</Typography><Typography color="text.secondary">Govern results frameworks, targets, reporting periods, verified actuals, evidence, and portfolio performance.</Typography></Box><Stack direction={{ xs: 'column', sm: 'row' }} gap={1}><FormControl size="small" sx={{ minWidth: 260 }}><InputLabel>Results framework</InputLabel><Select value={selectedFramework} label="Results framework" onChange={(event) => setSelectedFramework(event.target.value)}><MenuItem value="">All frameworks</MenuItem>{options.frameworks.map((item) => <MenuItem key={item.id} value={item.id}>{item.code} · {item.name}</MenuItem>)}</Select></FormControl><Button startIcon={<Refresh />} onClick={() => void load()}>Refresh</Button><Button component="a" href={`/api/kpis/reports/performance.csv${selectedFramework ? `?frameworkId=${selectedFramework}` : ''}`} target="_blank" variant="outlined">Export</Button>{contributor && <Button startIcon={<AttachFile />} onClick={() => setEvidenceOpen(true)}>Evidence</Button>}</Stack></Stack>
        {(summary.overduePeriods > 0 || summary.notReported > 0 || summary.pendingVerification > 0) && <Alert severity="warning" sx={{ mb: 2 }}>{summary.overduePeriods} overdue period(s), {summary.notReported} unreported KPI(s), and {summary.pendingVerification} result(s) awaiting independent verification require attention.</Alert>}
        <Grid container spacing={1.5} sx={{ mb: 2 }}>{cards.map(([name, value, icon]) => <Grid item xs={6} md={4} lg={2} key={name}><Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}><Stack direction="row" gap={1}>{icon}<Box><Typography variant="caption" color="text.secondary">{name}</Typography><Typography variant="h6" fontWeight={800}>{value}</Typography></Box></Stack></Paper></Grid>)}</Grid>
        <Card variant="outlined"><CardContent><Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" gap={1}><Tabs value={tab} onChange={(_event, value: KpiTab) => setTab(value)} variant="scrollable"><Tab value="frameworks" label={`Frameworks (${frameworks.length})`} /><Tab value="indicators" label={`Indicators (${indicators.length})`} /><Tab value="periods" label={`Periods (${periods.length})`} /><Tab value="workflow" label="Audit trail" /></Tabs><Stack direction="row" gap={1}>{manager && tab === 'frameworks' && <Button startIcon={<Add />} onClick={() => openCreate('framework')}>Framework</Button>}{manager && tab === 'indicators' && <Button startIcon={<Add />} variant="contained" onClick={() => openCreate('indicator')}>KPI</Button>}{manager && tab === 'periods' && <Button startIcon={<Add />} variant="contained" onClick={() => openCreate('period')}>Period</Button>}</Stack></Stack>
            <TextField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search frameworks, indicators, projects, owners, or reporting periods" fullWidth size="small" sx={{ my: 2 }} />
            {loading ? <Box sx={{ minHeight: 300, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : <>
                {tab === 'frameworks' && <Frameworks rows={frameworks.filter((item) => matches(item.code, item.name, item.project.title, item.owner.name))} manager={manager} addResult={(id) => openCreate('result', { frameworkId: id })} />}
                {tab === 'indicators' && <Indicators rows={indicators.filter((item) => matches(item.code, item.name, item.owner.name, item.resultLevel?.title))} manager={manager} contributor={contributor} options={options} target={(item) => openCreate('target', { frameworkId: item.frameworkId, indicatorId: item.id })} measure={(item) => openCreate('measurement', { frameworkId: item.frameworkId, indicatorId: item.id })} source={(item) => openCreate('source', { frameworkId: item.frameworkId, indicatorId: item.id, sourceType: 'TELEMETRY' })} submit={(id) => void act(`/measurements/${id}/submit`, {}, 'Measurement submitted')} decide={(id, status) => void act(`/measurements/${id}/decision`, { status, comment: 'Reviewed in M&E workspace' }, `Measurement ${label(status)}`)} sync={(sourceId, periodId) => void act(`/data-sources/${sourceId}/sync`, { periodId }, 'Operational result synchronized')} />}
                {tab === 'periods' && <Periods rows={periods.filter((item) => matches(item.name, item.status))} manager={manager} contributor={contributor} submit={(id) => void act(`/periods/${id}/submit`, {}, 'Reporting period submitted')} decide={(id, status) => void act(`/periods/${id}/decision`, { status, comment: 'Reviewed in M&E workspace' }, `Reporting period ${label(status)}`)} />}
                {tab === 'workflow' && <Workflow rows={register.events.filter((item) => matches(item.entityType, item.action, item.actor.name, item.comment))} />}
            </>}
        </CardContent></Card>
        <CreateDialog kind={createKind} form={form} setForm={setForm} options={options} frameworks={register.frameworks} close={() => setCreateKind(null)} save={() => void create()} saving={saving} />
        <EvidenceDialog open={evidenceOpen} form={evidence} setForm={setEvidence} indicators={indicators} close={() => setEvidenceOpen(false)} save={() => void attachEvidence()} saving={saving} />
    </Box>;
};

const Empty = ({ text }: { text: string }) => <Alert severity="info">{text}</Alert>;
const RecordCard: React.FC<{ title: string; subtitle: string; status: string; children?: React.ReactNode; actions?: React.ReactNode }> = ({ title, subtitle, status, children, actions }) => <Paper variant="outlined" sx={{ p: 1.5, mb: 1.25 }}><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1}><Box sx={{ flex: 1 }}><Stack direction="row" gap={1} alignItems="center"><Typography fontWeight={800}>{title}</Typography><Chip size="small" color={chipColor(status)} label={label(status)} /></Stack><Typography variant="body2" color="text.secondary">{subtitle}</Typography>{children}</Box>{actions && <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">{actions}</Stack>}</Stack></Paper>;
const Frameworks = ({ rows, manager, addResult }: { rows: ResultsFramework[]; manager: boolean; addResult: (id: string) => void }) => rows.length ? <>{rows.map((item) => <RecordCard key={item.id} title={`${item.code} · ${item.name}`} subtitle={`${item.project.code} · ${item.project.title} · ${item.owner.name}`} status={item.status} actions={manager ? <Button size="small" onClick={() => addResult(item.id)}>Add result</Button> : undefined}><Typography variant="caption">{dateLabel(item.startDate)} – {dateLabel(item.endDate)} · {item.resultLevels.length} result levels · {item.indicators.length} KPIs · {item.periods.length} periods</Typography>{item.resultLevels.length > 0 && <Stack direction="row" gap={.75} flexWrap="wrap" sx={{ mt: 1 }}>{item.resultLevels.map((result) => <Chip key={result.id} size="small" variant="outlined" label={`${label(result.type)} · ${result.code} · ${result.title}`} />)}</Stack>}</RecordCard>)}</> : <Empty text="No results frameworks match this search." />;
const Indicators = ({ rows, manager, contributor, options, target, measure, source, submit, decide, sync }: { rows: KpiIndicator[]; manager: boolean; contributor: boolean; options: KpiOptions; target: (item: KpiIndicator) => void; measure: (item: KpiIndicator) => void; source: (item: KpiIndicator) => void; submit: (id: string) => void; decide: (id: string, status: string) => void; sync: (sourceId: string, periodId: string) => void }) => rows.length ? <>{rows.map((item) => { const openPeriod = options.periods.find((period) => period.frameworkId === item.frameworkId && period.status === 'OPEN'); return <RecordCard key={item.id} title={`${item.code} · ${item.name}`} subtitle={`${label(item.direction)} · ${item.frequency.toLowerCase()} · Owner ${item.owner.name}`} status={item.performance.health} actions={<>{manager && <Button size="small" onClick={() => target(item)}>Target</Button>}{contributor && openPeriod && <Button size="small" onClick={() => measure(item)}>Report</Button>}{manager && <Button size="small" onClick={() => source(item)}>Source</Button>}</>}><Stack direction={{ xs: 'column', md: 'row' }} gap={2} sx={{ mt: .75 }}><Typography variant="caption">Baseline {item.baselineValue} {item.unit}</Typography><Typography variant="caption">Target {item.performance.target} {item.unit}</Typography><Typography variant="caption">Actual {item.performance.actual ?? 'Not reported'} {item.unit}</Typography><Typography variant="caption">Weight {item.weight}</Typography></Stack><LinearProgress color={item.performance.health === 'OFF_TRACK' ? 'error' : item.performance.health === 'AT_RISK' ? 'warning' : 'primary'} variant="determinate" value={Math.min(item.performance.achievement ?? 0, 100)} sx={{ mt: 1, height: 7, borderRadius: 4 }} /><Typography variant="caption" fontWeight={700}>{item.performance.achievement == null ? 'Awaiting verified result' : `${item.performance.achievement}% achievement`}</Typography>{item.measurements.slice(0, 4).map((measurement) => <Paper key={measurement.id} variant="outlined" sx={{ mt: 1, p: 1 }}><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1}><Typography variant="body2"><strong>{measurement.actualValue} {item.unit}</strong> · {dateLabel(measurement.measuredAt)} · {label(measurement.sourceType)} · {measurement.createdBy.name}</Typography><Stack direction="row" gap={1}><Chip size="small" label={label(measurement.status)} color={chipColor(measurement.status)} />{measurement.status === 'DRAFT' && <Button size="small" onClick={() => submit(measurement.id)}>Submit</Button>}{manager && measurement.status === 'SUBMITTED' && <><Button size="small" color="success" onClick={() => decide(measurement.id, 'VERIFIED')}>Verify</Button><Button size="small" color="error" onClick={() => decide(measurement.id, 'REJECTED')}>Reject</Button></>}</Stack></Stack></Paper>)}{item.dataSources.map((dataSource) => <Alert key={dataSource.id} severity={dataSource.lastError ? 'error' : 'info'} sx={{ mt: 1 }} action={manager && openPeriod ? <Button size="small" onClick={() => sync(dataSource.id, openPeriod.id)}>Sync</Button> : undefined}>{dataSource.name} · {label(dataSource.sourceType)} · {label(dataSource.aggregation)}{dataSource.lastValue ? ` · Last value ${dataSource.lastValue}` : ''}{dataSource.lastError ? ` · ${dataSource.lastError}` : ''}</Alert>)}</RecordCard>; })}</> : <Empty text="No KPI indicators match this search." />;
const Periods = ({ rows, manager, contributor, submit, decide }: { rows: KpiPeriod[]; manager: boolean; contributor: boolean; submit: (id: string) => void; decide: (id: string, status: string) => void }) => rows.length ? <>{rows.map((item) => <RecordCard key={item.id} title={item.name} subtitle={`${dateLabel(item.startDate)} – ${dateLabel(item.endDate)} · Due ${dateLabel(item.dueDate)}`} status={item.status} actions={<>{contributor && item.status === 'OPEN' && <Button size="small" onClick={() => submit(item.id)}>Submit period</Button>}{manager && item.status === 'SUBMITTED' && <><Button size="small" color="success" onClick={() => decide(item.id, 'APPROVED')}>Approve</Button><Button size="small" color="error" onClick={() => decide(item.id, 'REJECTED')}>Reject</Button></>}</>}><Typography variant="caption">{item.targets.length} period targets · {item.measurements.length} reported results{item.submittedBy ? ` · Submitted by ${item.submittedBy.name}` : ''}{item.reviewedBy ? ` · Reviewed by ${item.reviewedBy.name}` : ''}</Typography></RecordCard>)}</> : <Empty text="No reporting periods match this search." />;
const Workflow = ({ rows }: { rows: KpiEvent[] }) => rows.length ? <Stack spacing={1}>{rows.map((item) => <Paper key={item.id} variant="outlined" sx={{ p: 1.25 }}><Typography fontWeight={700}>{label(item.action)} · {label(item.entityType)}</Typography><Typography variant="caption" color="text.secondary">{item.actor.name} · {new Date(item.createdAt).toLocaleString()}{item.fromStatus || item.toStatus ? ` · ${label(item.fromStatus || 'new')} → ${label(item.toStatus || '')}` : ''}{item.comment ? ` · ${item.comment}` : ''}</Typography></Paper>)}</Stack> : <Empty text="No KPI workflow events match this search." />;

const CreateDialog: React.FC<{ kind: KpiCreateKind | null; form: typeof initialForm; setForm: React.Dispatch<React.SetStateAction<typeof initialForm>>; options: KpiOptions; frameworks: ResultsFramework[]; close: () => void; save: () => void; saving: boolean }> = ({ kind, form, setForm, options, frameworks, close, save, saving }) => {
    if (!kind) return null;
    const set = (key: keyof typeof initialForm) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value });
    const select = (key: keyof typeof initialForm) => (event: { target: { value: unknown } }) => setForm({ ...form, [key]: String(event.target.value) });
    const field = (key: keyof typeof initialForm, text: string, type = 'text', md = 6, required = true) => <Grid item xs={12} md={md}><TextField label={text} type={type} InputLabelProps={type === 'date' ? { shrink: true } : undefined} value={form[key]} onChange={set(key)} fullWidth required={required} /></Grid>;
    const choose = (key: keyof typeof initialForm, text: string, items: Array<{ value: string; text: string }>, optional = false) => <Grid item xs={12} md={6}><FormControl fullWidth required={!optional}><InputLabel>{text}</InputLabel><Select value={form[key]} label={text} onChange={select(key)}>{optional && <MenuItem value=""><em>Not linked</em></MenuItem>}{items.map((item) => <MenuItem key={item.value} value={item.value}>{item.text}</MenuItem>)}</Select></FormControl></Grid>;
    const frameworkSelect = choose('frameworkId', 'Results framework', options.frameworks.map((item) => ({ value: item.id, text: `${item.code} · ${item.name}` })));
    const activeFramework = frameworks.find((item) => item.id === form.frameworkId);
    const indicatorSelect = choose('indicatorId', 'KPI indicator', options.indicators.filter((item) => !form.frameworkId || item.frameworkId === form.frameworkId).map((item) => ({ value: item.id, text: `${item.code} · ${item.name}` })));
    const periodSelect = choose('periodId', 'Reporting period', options.periods.filter((item) => (!form.frameworkId || item.frameworkId === form.frameworkId) && item.status === 'OPEN').map((item) => ({ value: item.id, text: `${item.name} · ${dateLabel(item.endDate)}` })));
    return <Dialog open onClose={close} fullWidth maxWidth="md"><DialogTitle>Add {label(kind)}</DialogTitle><DialogContent><Grid container spacing={2} sx={{ mt: .25 }}>
        {kind === 'framework' && <>{choose('projectId', 'Project', options.projects.map((item) => ({ value: item.id, text: `${item.code} · ${item.title}` })))}{choose('ownerId', 'Framework owner', options.users.map((item) => ({ value: item.id, text: `${item.name} · ${item.email}` })))}{field('code', 'Framework code')}{field('name', 'Framework name')}{field('startDate', 'Start date', 'date')}{field('endDate', 'End date', 'date')}{field('description', 'Description', 'text', 12, false)}</>}
        {kind === 'result' && <>{field('code', 'Result code')}{choose('type', 'Result level', ['IMPACT', 'OUTCOME', 'OUTPUT'].map((value) => ({ value, text: label(value) })))}{field('name', 'Result statement', 'text', 12)}{choose('parentId', 'Parent result (optional)', (activeFramework?.resultLevels || []).map((item) => ({ value: item.id, text: `${item.code} · ${item.title}` })), true)}{field('sortOrder', 'Display order', 'number')}{field('description', 'Description', 'text', 12, false)}</>}
        {kind === 'indicator' && <>{frameworkSelect}{choose('resultLevelId', 'Result level (optional)', (activeFramework?.resultLevels || []).map((item) => ({ value: item.id, text: `${item.code} · ${item.title}` })), true)}{field('code', 'KPI code')}{field('name', 'KPI name')}{field('description', 'Precise indicator definition', 'text', 12)}{field('unit', 'Unit')}{choose('dataType', 'Data type', ['NUMBER', 'PERCENTAGE', 'CURRENCY', 'COUNT', 'BOOLEAN'].map((value) => ({ value, text: label(value) })))}{choose('direction', 'Desired direction', ['INCREASE', 'DECREASE', 'MAINTAIN'].map((value) => ({ value, text: label(value) })))}{choose('frequency', 'Reporting frequency', ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'AD_HOC'].map((value) => ({ value, text: label(value) })))}{field('baselineValue', 'Baseline value', 'number')}{field('baselineDate', 'Baseline date', 'date')}{field('finalTargetValue', 'Final target', 'number')}{field('weight', 'Weight', 'number')}{field('tolerance', 'Maintain tolerance', 'number')}{choose('ownerId', 'KPI owner', options.users.map((item) => ({ value: item.id, text: `${item.name} · ${item.email}` })))}{field('disaggregation', 'Disaggregation dimensions (comma separated)', 'text', 12, false)}{field('formula', 'Formula / calculation note', 'text', 12, false)}{field('sourceDescription', 'Data source description', 'text', 12, false)}</>}
        {kind === 'period' && <>{frameworkSelect}{field('name', 'Period name')}{field('startDate', 'Start date', 'date')}{field('endDate', 'End date', 'date')}{field('dueDate', 'Submission due date', 'date')}</>}
        {kind === 'target' && <>{indicatorSelect}{periodSelect}{field('targetValue', 'Period target', 'number')}{field('description', 'Target notes', 'text', 12, false)}</>}
        {kind === 'measurement' && <>{indicatorSelect}{periodSelect}{field('actualValue', 'Actual value', 'number')}{field('measuredAt', 'Measurement date', 'date')}{field('narrative', 'Performance narrative', 'text', 12, false)}{field('sourceReference', 'Source reference', 'text', 12, false)}</>}
        {kind === 'source' && <>{indicatorSelect}{field('name', 'Connector name')}{choose('sourceType', 'Operational source', ['TELEMETRY', 'ANALYTICS'].map((value) => ({ value, text: label(value) })))}{field('endpoint', 'Approved internal endpoint')}{field('valuePath', 'JSON value path')}{choose('aggregation', 'Aggregation', ['VALUE', 'AVERAGE', 'SUM', 'MINIMUM', 'MAXIMUM', 'COUNT'].map((value) => ({ value, text: label(value) })))}</>}
    </Grid></DialogContent><DialogActions><Button onClick={close}>Cancel</Button><Button variant="contained" disabled={saving} onClick={save}>Save</Button></DialogActions></Dialog>;
};

const EvidenceDialog: React.FC<{ open: boolean; form: typeof initialEvidence; setForm: React.Dispatch<React.SetStateAction<typeof initialEvidence>>; indicators: KpiIndicator[]; close: () => void; save: () => void; saving: boolean }> = ({ open, form, setForm, indicators, close, save, saving }) => {
    const records = useMemo(() => form.kind === 'indicatorId' ? indicators.map((item) => ({ id: item.id, text: `${item.code} · ${item.name}` })) : indicators.flatMap((indicator) => indicator.measurements.map((item) => ({ id: item.id, text: `${indicator.code} · ${item.actualValue} · ${dateLabel(item.measuredAt)}` }))), [form.kind, indicators]);
    return <Dialog open={open} onClose={close} fullWidth maxWidth="sm"><DialogTitle>Attach KPI evidence</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}><FormControl fullWidth><InputLabel>Record type</InputLabel><Select value={form.kind} label="Record type" onChange={(event) => setForm({ ...form, kind: event.target.value, recordId: '' })}><MenuItem value="measurementId">Reported result</MenuItem><MenuItem value="indicatorId">KPI definition</MenuItem></Select></FormControl><FormControl fullWidth required><InputLabel>KPI record</InputLabel><Select value={form.recordId} label="KPI record" onChange={(event) => setForm({ ...form, recordId: event.target.value })}>{records.map((item) => <MenuItem key={item.id} value={item.id}>{item.text}</MenuItem>)}</Select></FormControl><TextField label="Evidence name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /><TextField label="Secure HTTPS URL" type="url" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} required /><TextField label="MIME type" value={form.mimeType} onChange={(event) => setForm({ ...form, mimeType: event.target.value })} /><TextField label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} multiline /></Stack></DialogContent><DialogActions><Button onClick={close}>Cancel</Button><Button variant="contained" disabled={saving} onClick={save}>Attach Evidence</Button></DialogActions></Dialog>;
};

export default KpiPerformance;
