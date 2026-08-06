import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert, Box, Button, Card, CardActionArea, CardContent, Chip, CircularProgress, Dialog,
    DialogActions, DialogContent, DialogTitle, Divider, FormControl, Grid, InputLabel,
    LinearProgress, MenuItem, Paper, Select, Stack, TextField, Typography,
} from '@mui/material';
import { Add, Assignment, Flag, Groups, Inventory2, Refresh, ReportProblem, TaskAlt } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { apiRequest } from '../utils/auth';
import {
    PROJECT_STATUSES, Project, ProjectStatus, ProjectUser, RISK_LEVELS, RiskLevel,
} from '../utils/projects';

type RecordKind = 'objectives' | 'activities' | 'milestones' | 'deliverables' | 'risks' | 'assignments';
const statusLabel = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const dateValue = (value: string) => new Date(value).toLocaleDateString();
const statusColor = (status: ProjectStatus) => status === 'COMPLETED' ? 'success' : status === 'ON_HOLD' ? 'warning' : status === 'CANCELLED' ? 'error' : status === 'ACTIVE' ? 'primary' : 'default';

const initialProject = {
    title: '', code: '', department: '', location: '', managerId: '', startDate: '', endDate: '',
    status: 'PLANNED' as ProjectStatus, objectives: '', assignedStaffIds: [] as string[],
};

const Projects: React.FC = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<ProjectUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState(initialProject);
    const [addKind, setAddKind] = useState<RecordKind | null>(null);
    const [recordForm, setRecordForm] = useState({ title: '', description: '', dueDate: '', userId: '', role: '', level: 'MEDIUM' as RiskLevel });
    const [projectEdit, setProjectEdit] = useState({ status: 'PLANNED' as ProjectStatus, progress: 0 });

    const selected = projects.find((project) => project.id === selectedId) || null;
    const canCreate = Boolean(user && ['ADMINISTRATOR', 'PROJECT_MANAGER', 'DEPARTMENT_HEAD'].includes(user.role));
    const canManage = Boolean(user && selected && (
        user.role === 'ADMINISTRATOR' || user.role === 'DEPARTMENT_HEAD' ||
        (user.role === 'PROJECT_MANAGER' && selected.managerId === user.id)
    ));

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [projectResult, optionResult] = await Promise.all([
                apiRequest<{ projects: Project[] }>('/api/projects'),
                apiRequest<{ users: ProjectUser[] }>('/api/projects/options'),
            ]);
            setProjects(projectResult.projects);
            setUsers(optionResult.users);
            setSelectedId((current) => current && projectResult.projects.some((item) => item.id === current)
                ? current : projectResult.projects[0]?.id || null);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not load projects');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { void load(); }, [load]);
    useEffect(() => {
        if (selected) setProjectEdit({ status: selected.status, progress: selected.progress });
    }, [selectedId, selected?.status, selected?.progress]);

    const filtered = useMemo(() => {
        const value = search.trim().toLowerCase();
        return !value ? projects : projects.filter((project) =>
            [project.title, project.code, project.department, project.location, project.manager.name]
                .some((field) => field.toLowerCase().includes(value)));
    }, [projects, search]);

    const createProject = async () => {
        setCreating(true);
        try {
            const result = await apiRequest<{ project: Project }>('/api/projects', {
                method: 'POST',
                body: JSON.stringify({
                    ...form,
                    objectives: form.objectives.split('\n').map((item) => item.trim()).filter(Boolean),
                }),
            });
            setProjects((current) => [result.project, ...current]);
            setSelectedId(result.project.id);
            setCreateOpen(false);
            setForm(initialProject);
            toast.success('Project created');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not create project');
        } finally { setCreating(false); }
    };

    const saveProject = async () => {
        if (!selected) return;
        try {
            const result = await apiRequest<{ project: Project }>(`/api/projects/${selected.id}`, {
                method: 'PATCH', body: JSON.stringify(projectEdit),
            });
            setProjects((current) => current.map((item) => item.id === selected.id ? result.project : item));
            toast.success('Project progress updated');
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update project'); }
    };

    const addRecord = async () => {
        if (!selected || !addKind) return;
        const payload: Record<string, unknown> = {};
        if (addKind === 'objectives') payload.description = recordForm.description;
        if (addKind === 'activities') Object.assign(payload, { title: recordForm.title, description: recordForm.description || null, assignedToId: recordForm.userId || null });
        if (addKind === 'milestones') Object.assign(payload, { title: recordForm.title, description: recordForm.description || null, dueDate: recordForm.dueDate });
        if (addKind === 'deliverables') Object.assign(payload, { title: recordForm.title, description: recordForm.description || null, dueDate: recordForm.dueDate, assignedToId: recordForm.userId || null });
        if (addKind === 'risks') Object.assign(payload, { title: recordForm.title, description: recordForm.description, level: recordForm.level, mitigation: null, ownerId: recordForm.userId || null });
        if (addKind === 'assignments') Object.assign(payload, { userId: recordForm.userId, role: recordForm.role || null });
        try {
            await apiRequest(`/api/projects/${selected.id}/${addKind}`, { method: 'POST', body: JSON.stringify(payload) });
            setAddKind(null);
            setRecordForm({ title: '', description: '', dueDate: '', userId: '', role: '', level: 'MEDIUM' });
            await load();
            toast.success(`${statusLabel(addKind.slice(0, -1))} added`);
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not add record'); }
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} sx={{ mb: 3 }}>
                <Box><Typography variant="h4" color="primary" fontWeight={800}>Project Management</Typography><Typography color="text.secondary">Plan and track objectives, work, delivery, risk, and responsibility.</Typography></Box>
                <Stack direction="row" gap={1}><Button startIcon={<Refresh />} onClick={() => void load()}>Refresh</Button>{canCreate && <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>New Project</Button>}</Stack>
            </Stack>

            <TextField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects, codes, departments, locations, or managers" fullWidth sx={{ mb: 2 }} />
            {loading && projects.length === 0 ? <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 300 }}><CircularProgress /></Box> : (
                <Grid container spacing={2}>
                    <Grid item xs={12} lg={4}>
                        <Stack spacing={1.5}>{filtered.length === 0 && <Alert severity="info">No projects match this search.</Alert>}{filtered.map((project) => (
                            <Card key={project.id} variant={selectedId === project.id ? 'elevation' : 'outlined'} sx={{ borderColor: selectedId === project.id ? 'primary.main' : undefined }}>
                                <CardActionArea onClick={() => setSelectedId(project.id)}><CardContent>
                                    <Stack direction="row" justifyContent="space-between" gap={1}><Box><Typography fontWeight={800}>{project.title}</Typography><Typography variant="caption" color="text.secondary">{project.code} · {project.department}</Typography></Box><Chip size="small" color={statusColor(project.status)} label={statusLabel(project.status)} /></Stack>
                                    <LinearProgress variant="determinate" value={project.progress} sx={{ mt: 2, mb: .5, height: 7, borderRadius: 4 }} /><Typography variant="caption">{project.progress}% complete · {project.location}</Typography>
                                </CardContent></CardActionArea>
                            </Card>
                        ))}</Stack>
                    </Grid>
                    <Grid item xs={12} lg={8}>{selected ? <ProjectWorkspace project={selected} users={users} canManage={canManage} edit={projectEdit} setEdit={setProjectEdit} save={saveProject} add={(kind) => setAddKind(kind)} /> : <Alert severity="info">Create or select a project to view its management record.</Alert>}</Grid>
                </Grid>
            )}

            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="md">
                <DialogTitle>Create PMS project</DialogTitle><DialogContent><Grid container spacing={2} sx={{ mt: .25 }}>
                    <Grid item xs={12} md={8}><TextField label="Project title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth required /></Grid>
                    <Grid item xs={12} md={4}><TextField label="Project code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} fullWidth required /></Grid>
                    <Grid item xs={12} md={6}><TextField label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} fullWidth required /></Grid>
                    <Grid item xs={12} md={6}><TextField label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} fullWidth required /></Grid>
                    <Grid item xs={12}><FormControl fullWidth required><InputLabel>Project manager</InputLabel><Select value={form.managerId} label="Project manager" onChange={(e) => setForm({ ...form, managerId: e.target.value })}>{users.filter((item) => item.role === 'PROJECT_MANAGER' || item.role === 'ADMINISTRATOR').map((item) => <MenuItem key={item.id} value={item.id}>{item.name} · {item.email}</MenuItem>)}</Select></FormControl></Grid>
                    <Grid item xs={12} md={6}><TextField type="date" label="Start date" InputLabelProps={{ shrink: true }} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} fullWidth required /></Grid>
                    <Grid item xs={12} md={6}><TextField type="date" label="End date" InputLabelProps={{ shrink: true }} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} fullWidth required /></Grid>
                    <Grid item xs={12}><TextField label="Objectives (one per line)" value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} multiline minRows={4} fullWidth /></Grid>
                </Grid></DialogContent><DialogActions><Button onClick={() => setCreateOpen(false)}>Cancel</Button><Button variant="contained" onClick={() => void createProject()} disabled={creating}>{creating ? 'Creating…' : 'Create Project'}</Button></DialogActions>
            </Dialog>

            <AddRecordDialog kind={addKind} users={users} form={recordForm} setForm={setRecordForm} close={() => setAddKind(null)} submit={addRecord} />
        </Box>
    );
};

const ProjectWorkspace: React.FC<{
    project: Project; users: ProjectUser[]; canManage: boolean;
    edit: { status: ProjectStatus; progress: number };
    setEdit: React.Dispatch<React.SetStateAction<{ status: ProjectStatus; progress: number }>>;
    save: () => Promise<void>; add: (kind: RecordKind) => void;
}> = ({ project, canManage, edit, setEdit, save, add }) => (
    <Card><CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
            <Box><Typography variant="h5" fontWeight={800}>{project.title}</Typography><Typography color="text.secondary">{project.code} · {project.department} · {project.location}</Typography><Typography variant="body2" sx={{ mt: 1 }}>Manager: <strong>{project.manager.name}</strong> · {dateValue(project.startDate)} – {dateValue(project.endDate)}</Typography></Box>
            {canManage && <Stack direction="row" gap={1} alignItems="center"><FormControl size="small" sx={{ minWidth: 150 }}><InputLabel>Status</InputLabel><Select value={edit.status} label="Status" onChange={(e) => setEdit((current) => ({ ...current, status: e.target.value as ProjectStatus }))}>{PROJECT_STATUSES.map((status) => <MenuItem key={status} value={status}>{statusLabel(status)}</MenuItem>)}</Select></FormControl><TextField size="small" type="number" label="Progress %" value={edit.progress} inputProps={{ min: 0, max: 100 }} onChange={(e) => setEdit((current) => ({ ...current, progress: Number(e.target.value) }))} sx={{ width: 120 }} /><Button variant="contained" onClick={() => void save()}>Save</Button></Stack>}
        </Stack>
        <LinearProgress variant="determinate" value={project.progress} sx={{ my: 2, height: 9, borderRadius: 5 }} />
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
            {[['Objectives', project.objectives.length, <TaskAlt />], ['Activities', project.activities.length, <Assignment />], ['Milestones', project.milestones.length, <Flag />], ['Deliverables', project.deliverables.length, <Inventory2 />], ['Risks', project.risks.length, <ReportProblem />], ['Staff', project.assignments.length, <Groups />]].map(([label, count, icon]) => <Grid item xs={6} md={4} key={String(label)}><Paper variant="outlined" sx={{ p: 1.5 }}><Stack direction="row" gap={1} alignItems="center">{icon}<Box><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={800}>{count}</Typography></Box></Stack></Paper></Grid>)}
        </Grid>
        <Divider sx={{ mb: 2 }} />
        <RecordSection title="Objectives" kind="objectives" canManage={canManage} add={add} rows={project.objectives.map((item) => ({ primary: item.description, secondary: item.isCompleted ? 'Completed' : 'Open' }))} />
        <RecordSection title="Activities" kind="activities" canManage={canManage} add={add} rows={project.activities.map((item) => ({ primary: item.title, secondary: `${statusLabel(item.status)} · ${item.progress}%${item.assignedTo ? ` · ${item.assignedTo.name}` : ''}` }))} />
        <RecordSection title="Milestones" kind="milestones" canManage={canManage} add={add} rows={project.milestones.map((item) => ({ primary: item.title, secondary: `${dateValue(item.dueDate)} · ${statusLabel(item.status)}` }))} />
        <RecordSection title="Deliverables" kind="deliverables" canManage={canManage} add={add} rows={project.deliverables.map((item) => ({ primary: item.title, secondary: `${dateValue(item.dueDate)} · ${statusLabel(item.status)}${item.assignedTo ? ` · ${item.assignedTo.name}` : ''}` }))} />
        <RecordSection title="Risks" kind="risks" canManage={canManage} add={add} rows={project.risks.map((item) => ({ primary: item.title, secondary: `${statusLabel(item.level)} · ${statusLabel(item.status)} · ${item.description}` }))} />
        <RecordSection title="Assigned staff" kind="assignments" canManage={canManage} add={add} rows={project.assignments.map((item) => ({ primary: item.user.name, secondary: `${item.role || statusLabel(item.user.role || 'VIEWER')} · ${item.user.email}` }))} />
    </CardContent></Card>
);

const RecordSection: React.FC<{ title: string; kind: RecordKind; canManage: boolean; add: (kind: RecordKind) => void; rows: Array<{ primary: string; secondary: string }> }> = ({ title, kind, canManage, add, rows }) => (
    <Box sx={{ mb: 2 }}><Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="h6">{title}</Typography>{canManage && <Button size="small" startIcon={<Add />} onClick={() => add(kind)}>Add</Button>}</Stack>{rows.length === 0 ? <Typography variant="body2" color="text.secondary">No {title.toLowerCase()} recorded.</Typography> : rows.map((row, index) => <Paper key={`${row.primary}-${index}`} variant="outlined" sx={{ p: 1.25, mt: 1 }}><Typography variant="body2" fontWeight={700}>{row.primary}</Typography><Typography variant="caption" color="text.secondary">{row.secondary}</Typography></Paper>)}</Box>
);

const AddRecordDialog: React.FC<{
    kind: RecordKind | null; users: ProjectUser[];
    form: { title: string; description: string; dueDate: string; userId: string; role: string; level: RiskLevel };
    setForm: React.Dispatch<React.SetStateAction<{ title: string; description: string; dueDate: string; userId: string; role: string; level: RiskLevel }>>;
    close: () => void; submit: () => Promise<void>;
}> = ({ kind, users, form, setForm, close, submit }) => {
    if (!kind) return null;
    const needsTitle = kind !== 'objectives' && kind !== 'assignments';
    const needsDescription = kind !== 'assignments';
    const needsDueDate = kind === 'milestones' || kind === 'deliverables';
    const needsUser = kind === 'activities' || kind === 'deliverables' || kind === 'risks' || kind === 'assignments';
    return <Dialog open onClose={close} fullWidth maxWidth="sm"><DialogTitle>Add {statusLabel(kind.slice(0, -1))}</DialogTitle><DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
        {needsTitle && <TextField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required fullWidth />}
        {needsDescription && <TextField label={kind === 'objectives' ? 'Objective' : 'Description'} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required={kind === 'objectives' || kind === 'risks'} multiline minRows={3} fullWidth />}
        {needsDueDate && <TextField type="date" label="Due date" InputLabelProps={{ shrink: true }} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required fullWidth />}
        {kind === 'risks' && <FormControl fullWidth><InputLabel>Risk level</InputLabel><Select value={form.level} label="Risk level" onChange={(e) => setForm({ ...form, level: e.target.value as RiskLevel })}>{RISK_LEVELS.map((level) => <MenuItem key={level} value={level}>{statusLabel(level)}</MenuItem>)}</Select></FormControl>}
        {needsUser && <FormControl fullWidth required={kind === 'assignments'}><InputLabel>{kind === 'assignments' ? 'Staff member' : 'Owner / assignee'}</InputLabel><Select value={form.userId} label={kind === 'assignments' ? 'Staff member' : 'Owner / assignee'} onChange={(e) => setForm({ ...form, userId: e.target.value })}><MenuItem value=""><em>Unassigned</em></MenuItem>{users.map((item) => <MenuItem key={item.id} value={item.id}>{item.name} · {item.email}</MenuItem>)}</Select></FormControl>}
        {kind === 'assignments' && <TextField label="Project responsibility" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} fullWidth />}
    </Stack></DialogContent><DialogActions><Button onClick={close}>Cancel</Button><Button variant="contained" onClick={() => void submit()}>Add</Button></DialogActions></Dialog>;
};

export default Projects;
