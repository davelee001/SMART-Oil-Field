import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
    DialogTitle, FormControl, Grid, InputLabel, MenuItem, Paper, Select, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { Add, AttachFile, Business, LocalShipping, Refresh, RequestQuote, Star, Work } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/auth';
import {
    PurchaseRequest, Supplier, SupplierContract, SupplierDelivery, SupplierReview, SupplyChainTab,
    SupplyEvent, SupplyOptions, SupplyRecordKind, SupplyRegister, SupplySummary,
} from '../utils/supplyChain';

const label = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateLabel = (value: string) => new Date(value).toLocaleDateString();
const money = (value: string, currency = 'USD') => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value));
const color = (status: string) => ['QUALIFIED', 'ACTIVE', 'APPROVED', 'ACCEPTED', 'DELIVERED'].includes(status) ? 'success' : ['BLACKLISTED', 'REJECTED', 'EXPIRED', 'TERMINATED'].includes(status) ? 'error' : ['PENDING_QUALIFICATION', 'UNDER_REVIEW', 'SUBMITTED', 'EXPIRING', 'LATE'].includes(status) ? 'warning' : 'default';
const emptyRegister: SupplyRegister = { suppliers: [], contracts: [], requests: [], deliveries: [], reviews: [], events: [] };
const emptySummary: SupplySummary = { totalSuppliers: 0, qualifiedSuppliers: 0, pendingQualifications: 0, expiringQualifications: 0, activeContracts: 0, expiringContracts: 0, pendingRequests: 0, lateDeliveries: 0, averagePerformance: 0, belowStandardSuppliers: 0 };
const initialForm = {
    supplierCode: '', legalName: '', tradingName: '', registrationNumber: '', taxNumber: '', sector: 'UPSTREAM', categories: '', country: '', address: '', contactName: '', contactEmail: '', contactPhone: '', localContentPercentage: '0', hseCertification: '', notes: '',
    supplierId: '', reference: '', expiresAt: '', contractId: '', projectId: '', contractNumber: '', title: '', description: '', startDate: '', endDate: '', currency: 'USD', value: '', renewalLeadDays: '90', responsibleOfficerId: '', signedAt: '',
    requestNumber: '', requiredBy: '', estimatedAmount: '', purchaseRequestId: '', deliveryNumber: '', scheduledDate: '', actualDate: '', location: '', items: '',
    periodStart: '', periodEnd: '', qualityScore: '', deliveryScore: '', hseScore: '', localContentScore: '', costScore: '',
};
const initialEvidence = { kind: 'supplierId', recordId: '', name: '', url: '', mimeType: 'application/pdf', notes: '' };

const SupplyChain: React.FC = () => {
    const { user } = useAuth();
    const [register, setRegister] = useState(emptyRegister);
    const [summary, setSummary] = useState(emptySummary);
    const [options, setOptions] = useState<SupplyOptions>({ users: [], projects: [], suppliers: [], contracts: [], requests: [] });
    const [tab, setTab] = useState<SupplyChainTab>('suppliers');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [createKind, setCreateKind] = useState<SupplyRecordKind | null>(null);
    const [form, setForm] = useState(initialForm);
    const [evidenceOpen, setEvidenceOpen] = useState(false);
    const [evidence, setEvidence] = useState(initialEvidence);
    const manager = Boolean(user && ['ADMINISTRATOR', 'SUPPLY_CHAIN_OFFICER'].includes(user.role));
    const contributor = Boolean(user && ['ADMINISTRATOR', 'SUPPLY_CHAIN_OFFICER', 'PROJECT_MANAGER', 'DEPARTMENT_HEAD'].includes(user.role));

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [data, overview, optionData] = await Promise.all([
                apiRequest<SupplyRegister>('/api/supply-chain/register'), apiRequest<{ summary: SupplySummary }>('/api/supply-chain/overview'), apiRequest<SupplyOptions>('/api/supply-chain/options'),
            ]);
            setRegister(data); setSummary(overview.summary); setOptions(optionData);
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not load the supplier register'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { void load(); }, [load]);
    const mutate = async (path: string, request: RequestInit, success: string) => {
        setSaving(true);
        try { await apiRequest(path, request); await load(); toast.success(success); return true; }
        catch (error) { toast.error(error instanceof Error ? error.message : 'Supply-chain operation failed'); return false; }
        finally { setSaving(false); }
    };
    const openCreate = (kind: SupplyRecordKind, supplierId = '') => { setCreateKind(kind); setForm({ ...initialForm, supplierId }); };
    const create = async () => {
        if (!createKind) return;
        let path = `/${createKind}`; let body: Record<string, unknown> = {};
        if (createKind === 'suppliers') body = { supplierCode: form.supplierCode, legalName: form.legalName, tradingName: form.tradingName || null, registrationNumber: form.registrationNumber || null, taxNumber: form.taxNumber || null, sector: form.sector, categories: form.categories.split(',').map((item) => item.trim()).filter(Boolean), country: form.country, address: form.address || null, contactName: form.contactName, contactEmail: form.contactEmail, contactPhone: form.contactPhone || null, localContentPercentage: Number(form.localContentPercentage), hseCertification: form.hseCertification || null, notes: form.notes || null };
        if (createKind === 'qualification') { path = `/suppliers/${form.supplierId}/qualifications`; body = { reference: form.reference, expiresAt: form.expiresAt || null, notes: form.notes || null }; }
        if (createKind === 'contracts') body = { supplierId: form.supplierId, projectId: form.projectId || null, contractNumber: form.contractNumber, title: form.title, description: form.description || null, startDate: form.startDate, endDate: form.endDate, currency: form.currency, value: Number(form.value), renewalLeadDays: Number(form.renewalLeadDays), responsibleOfficerId: form.responsibleOfficerId, signedAt: form.signedAt || null };
        if (createKind === 'requests') { path = '/purchase-requests'; body = { requestNumber: form.requestNumber, supplierId: form.supplierId || null, contractId: form.contractId || null, projectId: form.projectId || null, title: form.title, description: form.description, requiredBy: form.requiredBy, currency: form.currency, estimatedAmount: Number(form.estimatedAmount) }; }
        if (createKind === 'deliveries') body = { supplierId: form.supplierId, contractId: form.contractId || null, purchaseRequestId: form.purchaseRequestId || null, deliveryNumber: form.deliveryNumber, scheduledDate: form.scheduledDate, actualDate: form.actualDate || null, location: form.location, items: form.items };
        if (createKind === 'reviews') { path = '/performance-reviews'; body = { supplierId: form.supplierId, contractId: form.contractId || null, periodStart: form.periodStart, periodEnd: form.periodEnd, qualityScore: Number(form.qualityScore), deliveryScore: Number(form.deliveryScore), hseScore: Number(form.hseScore), localContentScore: Number(form.localContentScore), costScore: Number(form.costScore), comments: form.notes || null }; }
        const ok = await mutate(`/api/supply-chain${path}`, { method: 'POST', body: JSON.stringify(body) }, `${label(createKind)} record created`);
        if (ok) setCreateKind(null);
    };
    const act = (path: string, body: Record<string, unknown>, success: string) => mutate(`/api/supply-chain${path}`, { method: 'POST', body: JSON.stringify(body) }, success);
    const attachEvidence = async () => {
        const ok = await mutate('/api/supply-chain/evidence', { method: 'POST', body: JSON.stringify({ [evidence.kind]: evidence.recordId, name: evidence.name, url: evidence.url, mimeType: evidence.mimeType || null, notes: evidence.notes || null }) }, 'Evidence attached');
        if (ok) { setEvidenceOpen(false); setEvidence(initialEvidence); }
    };
    const query = search.trim().toLowerCase();
    const matches = (...values: unknown[]) => !query || values.some((value) => String(value || '').toLowerCase().includes(query));
    const cards = [
        ['Suppliers', summary.totalSuppliers, <Business />], ['Qualified', summary.qualifiedSuppliers, <Star />], ['Active contracts', summary.activeContracts, <Work />],
        ['Pending requests', summary.pendingRequests, <RequestQuote />], ['Late deliveries', summary.lateDeliveries, <LocalShipping />], ['Below standard', summary.belowStandardSuppliers, <Star />],
    ] as const;

    return <Box sx={{ width: '100%' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}><Box><Typography variant="h4" color="primary" fontWeight={800}>Suppliers & Supply Chain</Typography><Typography color="text.secondary">Qualify oil-sector suppliers, control procurement, monitor delivery, and score HSE, quality, cost, local content, and timeliness.</Typography></Box><Stack direction="row" gap={1} flexWrap="wrap"><Button startIcon={<Refresh />} onClick={() => void load()}>Refresh</Button><Button component="a" href="/api/supply-chain/reports/suppliers.csv" target="_blank" variant="outlined">Export Register</Button>{contributor && <Button startIcon={<AttachFile />} onClick={() => setEvidenceOpen(true)}>Evidence</Button>}</Stack></Stack>
        <Grid container spacing={1.5} sx={{ mb: 2 }}>{cards.map(([name, value, icon]) => <Grid item xs={6} md={4} lg={2} key={name}><Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}><Stack direction="row" gap={1}>{icon}<Box><Typography variant="caption" color="text.secondary">{name}</Typography><Typography variant="h6" fontWeight={800}>{value}</Typography></Box></Stack></Paper></Grid>)}</Grid>
        <Card variant="outlined"><CardContent><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1}><Tabs value={tab} onChange={(_event, value: SupplyChainTab) => setTab(value)} variant="scrollable"><Tab value="suppliers" label={`Suppliers (${register.suppliers.length})`} /><Tab value="contracts" label={`Contracts (${register.contracts.length})`} /><Tab value="requests" label={`Requests (${register.requests.length})`} /><Tab value="deliveries" label={`Deliveries (${register.deliveries.length})`} /><Tab value="reviews" label={`Reviews (${register.reviews.length})`} /><Tab value="workflow" label="Audit trail" /></Tabs>{tab !== 'workflow' && ((manager && ['suppliers', 'contracts', 'reviews'].includes(tab)) || (contributor && ['requests', 'deliveries'].includes(tab))) && <Button startIcon={<Add />} variant="contained" onClick={() => openCreate(tab)}>Add {label(tab.slice(0, -1))}</Button>}</Stack>
            <TextField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the selected supply-chain register" fullWidth size="small" sx={{ my: 2 }} />
            {loading ? <Box sx={{ minHeight: 260, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : <>
                {tab === 'suppliers' && <Suppliers rows={register.suppliers.filter((item) => matches(item.supplierCode, item.legalName, item.sector, item.categories.join(' ')))} manager={manager} qualify={(id) => openCreate('qualification', id)} decide={(id, status) => void act(`/qualifications/${id}/decision`, { status, technicalScore: 80, financialScore: 80, hseScore: 80, localContentScore: 80, notes: 'Reviewed in supplier workspace' }, `Qualification ${label(status)}`)} />}
                {tab === 'contracts' && <Contracts rows={register.contracts.filter((item) => matches(item.contractNumber, item.title, item.supplier.legalName))} />}
                {tab === 'requests' && <Requests rows={register.requests.filter((item) => matches(item.requestNumber, item.title, item.supplier?.legalName, item.project?.title))} manager={manager} submit={(id) => void act(`/purchase-requests/${id}/submit`, {}, 'Request submitted')} decide={(id, status) => void act(`/purchase-requests/${id}/decision`, { status, comment: 'Reviewed in procurement workspace' }, `Request ${label(status)}`)} />}
                {tab === 'deliveries' && <Deliveries rows={register.deliveries.filter((item) => matches(item.deliveryNumber, item.supplier.legalName, item.location, item.items))} contributor={contributor} decide={(id, status) => void act(`/deliveries/${id}/accept`, { status, qualityScore: 80, hseScore: 80, notes: 'Inspected in delivery workspace' }, `Delivery ${label(status)}`)} />}
                {tab === 'reviews' && <Reviews rows={register.reviews.filter((item) => matches(item.supplier.legalName, item.comments))} />}
                {tab === 'workflow' && <Workflow rows={register.events.filter((item) => matches(item.entityType, item.action, item.actor.name, item.comment))} />}
            </>}
        </CardContent></Card>
        <CreateDialog kind={createKind} form={form} setForm={setForm} options={options} close={() => setCreateKind(null)} save={() => void create()} saving={saving} />
        <EvidenceDialog open={evidenceOpen} form={evidence} setForm={setEvidence} register={register} close={() => setEvidenceOpen(false)} save={() => void attachEvidence()} saving={saving} />
    </Box>;
};

const Empty = ({ text }: { text: string }) => <Alert severity="info">{text}</Alert>;
const RecordCard: React.FC<{ title: string; subtitle: string; status: string; children?: React.ReactNode; actions?: React.ReactNode }> = ({ title, subtitle, status, children, actions }) => <Paper variant="outlined" sx={{ p: 1.5, mb: 1.25 }}><Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1}><Box><Stack direction="row" gap={1} alignItems="center"><Typography fontWeight={800}>{title}</Typography><Chip size="small" color={color(status)} label={label(status)} /></Stack><Typography variant="body2" color="text.secondary">{subtitle}</Typography>{children}</Box>{actions && <Stack direction="row" gap={1} alignItems="center">{actions}</Stack>}</Stack></Paper>;
const Suppliers = ({ rows, manager, qualify, decide }: { rows: Supplier[]; manager: boolean; qualify: (id: string) => void; decide: (id: string, status: string) => void }) => rows.length ? <>{rows.map((item) => { const pending = item.qualifications.find((entry) => entry.effectiveStatus === 'UNDER_REVIEW'); return <RecordCard key={item.id} title={`${item.supplierCode} · ${item.legalName}`} subtitle={`${label(item.sector)} · ${item.country} · ${item.categories.join(', ')}`} status={item.status} actions={manager ? <>{!pending && item.status !== 'QUALIFIED' && <Button size="small" onClick={() => qualify(item.id)}>Qualify</Button>}{pending && <><Button size="small" color="success" onClick={() => decide(pending.id, 'APPROVED')}>Approve</Button><Button size="small" color="error" onClick={() => decide(pending.id, 'REJECTED')}>Reject</Button></>}</> : undefined}><Typography variant="caption">Local content {item.localContentPercentage}% · Performance {item.averagePerformance == null ? 'Not scored' : `${item.averagePerformance}%`} · Contact {item.contactName}</Typography></RecordCard>; })}</> : <Empty text="No suppliers match this search." />;
const Contracts = ({ rows }: { rows: SupplierContract[] }) => rows.length ? <>{rows.map((item) => <RecordCard key={item.id} title={`${item.contractNumber} · ${item.title}`} subtitle={`${item.supplier.legalName} · ${item.project?.title || 'Corporate'} · ${item.responsibleOfficer.name}`} status={item.effectiveStatus}><Typography variant="caption">{dateLabel(item.startDate)} – {dateLabel(item.endDate)} · {money(item.value, item.currency)}</Typography></RecordCard>)}</> : <Empty text="No contracts match this search." />;
const Requests = ({ rows, manager, submit, decide }: { rows: PurchaseRequest[]; manager: boolean; submit: (id: string) => void; decide: (id: string, status: string) => void }) => rows.length ? <>{rows.map((item) => <RecordCard key={item.id} title={`${item.requestNumber} · ${item.title}`} subtitle={`${item.createdBy.name} · ${item.supplier?.legalName || 'Supplier not assigned'} · Required ${dateLabel(item.requiredBy)}`} status={item.status} actions={<>{item.status === 'DRAFT' && <Button size="small" onClick={() => submit(item.id)}>Submit</Button>}{manager && item.status === 'SUBMITTED' && <><Button size="small" color="success" onClick={() => decide(item.id, 'APPROVED')}>Approve</Button><Button size="small" color="error" onClick={() => decide(item.id, 'REJECTED')}>Reject</Button></>}</>}><Typography variant="caption">Estimated {money(item.estimatedAmount, item.currency)}{item.reviewComment ? ` · ${item.reviewComment}` : ''}</Typography></RecordCard>)}</> : <Empty text="No requests match this search." />;
const Deliveries = ({ rows, contributor, decide }: { rows: SupplierDelivery[]; contributor: boolean; decide: (id: string, status: string) => void }) => rows.length ? <>{rows.map((item) => <RecordCard key={item.id} title={`${item.deliveryNumber} · ${item.supplier.legalName}`} subtitle={`${item.location} · Scheduled ${dateLabel(item.scheduledDate)}`} status={item.status} actions={contributor && !['ACCEPTED', 'REJECTED'].includes(item.status) ? <><Button size="small" color="success" onClick={() => decide(item.id, 'ACCEPTED')}>Accept</Button><Button size="small" color="error" onClick={() => decide(item.id, 'REJECTED')}>Reject</Button></> : undefined}><Typography variant="body2">{item.items}</Typography><Typography variant="caption">Quality {item.qualityScore ?? '–'} · HSE {item.hseScore ?? '–'}{item.acceptedBy ? ` · Inspected by ${item.acceptedBy.name}` : ''}</Typography></RecordCard>)}</> : <Empty text="No deliveries match this search." />;
const Reviews = ({ rows }: { rows: SupplierReview[] }) => rows.length ? <>{rows.map((item) => <RecordCard key={item.id} title={`${item.supplier.legalName} · ${item.overallScore}%`} subtitle={`${dateLabel(item.periodStart)} – ${dateLabel(item.periodEnd)} · ${item.reviewer.name}`} status={Number(item.overallScore) >= 70 ? 'QUALIFIED' : 'UNDER_REVIEW'}><Typography variant="caption">Quality {item.qualityScore} · Delivery {item.deliveryScore} · HSE {item.hseScore} · Local content {item.localContentScore} · Cost {item.costScore}</Typography></RecordCard>)}</> : <Empty text="No performance reviews match this search." />;
const Workflow = ({ rows }: { rows: SupplyEvent[] }) => rows.length ? <Stack spacing={1}>{rows.map((item) => <Paper key={item.id} variant="outlined" sx={{ p: 1.25 }}><Typography fontWeight={700}>{label(item.action)} · {label(item.entityType)}</Typography><Typography variant="caption" color="text.secondary">{item.actor.name} · {new Date(item.createdAt).toLocaleString()}{item.fromStatus || item.toStatus ? ` · ${label(item.fromStatus || 'new')} → ${label(item.toStatus || '')}` : ''}{item.comment ? ` · ${item.comment}` : ''}</Typography></Paper>)}</Stack> : <Empty text="No workflow events match this search." />;

const CreateDialog: React.FC<{ kind: SupplyRecordKind | null; form: typeof initialForm; setForm: React.Dispatch<React.SetStateAction<typeof initialForm>>; options: SupplyOptions; close: () => void; save: () => void; saving: boolean }> = ({ kind, form, setForm, options, close, save, saving }) => {
    if (!kind) return null;
    const set = (key: keyof typeof initialForm) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value });
    const select = (key: keyof typeof initialForm) => (event: { target: { value: unknown } }) => setForm({ ...form, [key]: String(event.target.value) });
    const field = (key: keyof typeof initialForm, text: string, type = 'text', md = 6) => <Grid item xs={12} md={md}><TextField label={text} type={type} InputLabelProps={type === 'date' ? { shrink: true } : undefined} value={form[key]} onChange={set(key)} fullWidth required /></Grid>;
    const choose = (key: keyof typeof initialForm, text: string, items: Array<{ value: string; text: string }>, optional = false) => <Grid item xs={12} md={6}><FormControl fullWidth required={!optional}><InputLabel>{text}</InputLabel><Select value={form[key]} label={text} onChange={select(key)}>{optional && <MenuItem value=""><em>Not linked</em></MenuItem>}{items.map((item) => <MenuItem key={item.value} value={item.value}>{item.text}</MenuItem>)}</Select></FormControl></Grid>;
    const supplier = choose('supplierId', 'Supplier', options.suppliers.map((item) => ({ value: item.id, text: `${item.supplierCode} · ${item.legalName}` })));
    const contract = choose('contractId', 'Contract (optional)', options.contracts.filter((item) => !form.supplierId || item.supplierId === form.supplierId).map((item) => ({ value: item.id, text: `${item.contractNumber} · ${item.title}` })), true);
    return <Dialog open onClose={close} fullWidth maxWidth="md"><DialogTitle>Add {label(kind)}</DialogTitle><DialogContent><Grid container spacing={2} sx={{ mt: .25 }}>
        {kind === 'suppliers' && <>{field('supplierCode', 'Supplier code', 'text', 4)}{field('legalName', 'Legal name', 'text', 8)}{field('tradingName', 'Trading name')}{field('registrationNumber', 'Registration number')}{choose('sector', 'Oil-sector segment', ['UPSTREAM', 'MIDSTREAM', 'DOWNSTREAM', 'CROSS_SECTOR'].map((value) => ({ value, text: label(value) })))}{field('categories', 'Categories (comma separated)')}{field('country', 'Country')}{field('address', 'Address')}{field('contactName', 'Contact name')}{field('contactEmail', 'Contact email', 'email')}{field('contactPhone', 'Contact phone')}{field('localContentPercentage', 'Local content %', 'number')}{field('hseCertification', 'HSE certification')}{field('notes', 'Notes')}</>}
        {kind === 'qualification' && <>{field('reference', 'Qualification reference')}{field('expiresAt', 'Expiry date', 'date')}{field('notes', 'Review notes', 'text', 12)}</>}
        {kind === 'contracts' && <>{supplier}{field('contractNumber', 'Contract number')}{field('title', 'Contract title', 'text', 12)}{choose('projectId', 'Project (optional)', options.projects.map((item) => ({ value: item.id, text: `${item.code} · ${item.title}` })), true)}{choose('responsibleOfficerId', 'Responsible officer', options.users.map((item) => ({ value: item.id, text: `${item.name} · ${item.email}` })))}{field('startDate', 'Start date', 'date')}{field('endDate', 'End date', 'date')}{field('currency', 'Currency')}{field('value', 'Contract value', 'number')}{field('renewalLeadDays', 'Renewal lead days', 'number')}{field('signedAt', 'Signed date', 'date')}{field('description', 'Description', 'text', 12)}</>}
        {kind === 'requests' && <>{field('requestNumber', 'Request number')}{field('title', 'Request title')}{supplier}{contract}{choose('projectId', 'Project (optional)', options.projects.map((item) => ({ value: item.id, text: `${item.code} · ${item.title}` })), true)}{field('requiredBy', 'Required by', 'date')}{field('currency', 'Currency')}{field('estimatedAmount', 'Estimated amount', 'number')}{field('description', 'Business need', 'text', 12)}</>}
        {kind === 'deliveries' && <>{supplier}{contract}{choose('purchaseRequestId', 'Purchase request (optional)', options.requests.filter((item) => !form.supplierId || item.supplierId === form.supplierId).map((item) => ({ value: item.id, text: `${item.requestNumber} · ${item.title}` })), true)}{field('deliveryNumber', 'Delivery number')}{field('scheduledDate', 'Scheduled date', 'date')}{field('actualDate', 'Actual date', 'date')}{field('location', 'Delivery location')}{field('items', 'Items / quantity', 'text', 12)}</>}
        {kind === 'reviews' && <>{supplier}{contract}{field('periodStart', 'Period start', 'date')}{field('periodEnd', 'Period end', 'date')}{field('qualityScore', 'Quality score', 'number')}{field('deliveryScore', 'Delivery score', 'number')}{field('hseScore', 'HSE score', 'number')}{field('localContentScore', 'Local content score', 'number')}{field('costScore', 'Cost score', 'number')}{field('notes', 'Comments')}</>}
    </Grid></DialogContent><DialogActions><Button onClick={close}>Cancel</Button><Button variant="contained" disabled={saving} onClick={save}>Create Record</Button></DialogActions></Dialog>;
};

const EvidenceDialog: React.FC<{ open: boolean; form: typeof initialEvidence; setForm: React.Dispatch<React.SetStateAction<typeof initialEvidence>>; register: SupplyRegister; close: () => void; save: () => void; saving: boolean }> = ({ open, form, setForm, register, close, save, saving }) => {
    const records = useMemo(() => form.kind === 'supplierId' ? register.suppliers.map((item) => ({ id: item.id, text: `${item.supplierCode} · ${item.legalName}` })) : form.kind === 'qualificationId' ? register.suppliers.flatMap((supplier) => supplier.qualifications.map((item) => ({ id: item.id, text: `${item.reference} · ${supplier.legalName}` }))) : form.kind === 'contractId' ? register.contracts.map((item) => ({ id: item.id, text: `${item.contractNumber} · ${item.title}` })) : form.kind === 'purchaseRequestId' ? register.requests.map((item) => ({ id: item.id, text: `${item.requestNumber} · ${item.title}` })) : form.kind === 'deliveryId' ? register.deliveries.map((item) => ({ id: item.id, text: `${item.deliveryNumber} · ${item.supplier.legalName}` })) : register.reviews.map((item) => ({ id: item.id, text: `${item.supplier.legalName} · ${dateLabel(item.periodEnd)}` })), [form.kind, register]);
    return <Dialog open={open} onClose={close} fullWidth maxWidth="sm"><DialogTitle>Attach supply-chain evidence</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}><FormControl fullWidth><InputLabel>Record type</InputLabel><Select value={form.kind} label="Record type" onChange={(event) => setForm({ ...form, kind: event.target.value, recordId: '' })}>{[['supplierId', 'Supplier'], ['qualificationId', 'Qualification'], ['contractId', 'Contract'], ['purchaseRequestId', 'Purchase request'], ['deliveryId', 'Delivery'], ['reviewId', 'Performance review']].map(([value, text]) => <MenuItem key={value} value={value}>{text}</MenuItem>)}</Select></FormControl><FormControl fullWidth required><InputLabel>Record</InputLabel><Select value={form.recordId} label="Record" onChange={(event) => setForm({ ...form, recordId: event.target.value })}>{records.map((item) => <MenuItem key={item.id} value={item.id}>{item.text}</MenuItem>)}</Select></FormControl><TextField label="Evidence name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /><TextField label="Secure HTTPS URL" type="url" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} required /><TextField label="MIME type" value={form.mimeType} onChange={(event) => setForm({ ...form, mimeType: event.target.value })} /><TextField label="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} multiline /></Stack></DialogContent><DialogActions><Button onClick={close}>Cancel</Button><Button variant="contained" disabled={saving} onClick={save}>Attach Evidence</Button></DialogActions></Dialog>;
};

export default SupplyChain;
