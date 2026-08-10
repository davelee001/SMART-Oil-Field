import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert, Box, Button, Card, CardContent, Chip, FormControl, Grid, InputLabel, MenuItem,
    Select, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, Typography, IconButton, InputAdornment,
} from '@mui/material';
import {
    PersonAddOutlined as AddUserIcon, Refresh as RefreshIcon, Visibility, VisibilityOff,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { apiRequest, AppUser, PMS_ROLES, PmsRole, ROLE_LABELS } from '../utils/auth';

const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [department, setDepartment] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState<PmsRole>('VIEWER');
    const [creating, setCreating] = useState(false);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const result = await apiRequest<{ users: AppUser[] }>('/api/admin/users');
            setUsers(result.users);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not load users');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { void loadUsers(); }, [loadUsers]);

    const createUser = async (event: React.FormEvent) => {
        event.preventDefault();
        setCreating(true);
        try {
            const result = await apiRequest<{ user: AppUser }>('/api/admin/users', {
                method: 'POST', body: JSON.stringify({ name, email, password, role, department: department || null }),
            });
            setUsers((current) => [...current, result.user].sort((a, b) => a.name.localeCompare(b.name)));
            setName(''); setEmail(''); setDepartment(''); setPassword(''); setRole('VIEWER');
            toast.success('User created');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not create user');
        } finally { setCreating(false); }
    };

    const updateUser = async (id: string, changes: { role?: PmsRole; isActive?: boolean; department?: string | null }) => {
        try {
            const result = await apiRequest<{ user: AppUser }>(`/api/admin/users/${id}`, {
                method: 'PATCH', body: JSON.stringify(changes),
            });
            setUsers((current) => current.map((item) => item.id === id ? result.user : item));
            toast.success('User access updated');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not update user');
        }
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h4" color="primary" fontWeight={800}>User Management</Typography>
                <Typography color="text.secondary">Create accounts and assign PMS responsibilities and access.</Typography>
            </Box>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>Add user</Typography>
                    <Box component="form" onSubmit={createUser}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={2}><TextField label="Full Name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth /></Grid>
                            <Grid item xs={12} md={2}><TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required fullWidth /></Grid>
                            <Grid item xs={12} md={2}><TextField label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} fullWidth /></Grid>
                            <Grid item xs={12} md={2}>
                                <TextField
                                    label="Temporary Password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    inputProps={{ minLength: 12 }}
                                    autoComplete="new-password"
                                    required
                                    fullWidth
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                    onClick={() => setShowPassword((visible) => !visible)}
                                                    onMouseDown={(event) => event.preventDefault()}
                                                    edge="end"
                                                >
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <FormControl fullWidth><InputLabel>Role</InputLabel><Select value={role} label="Role" onChange={(e) => setRole(e.target.value as PmsRole)}>
                                    {PMS_ROLES.map((item) => <MenuItem key={item} value={item}>{ROLE_LABELS[item]}</MenuItem>)}
                                </Select></FormControl>
                            </Grid>
                            <Grid item xs={12} md={2}><Button type="submit" variant="contained" startIcon={<AddUserIcon />} disabled={creating} fullWidth>{creating ? 'Adding…' : 'Add User'}</Button></Grid>
                        </Grid>
                    </Box>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6">Users ({users.length})</Typography>
                        <Button startIcon={<RefreshIcon />} onClick={() => void loadUsers()} disabled={loading}>Refresh</Button>
                    </Stack>
                    {loading && users.length === 0 ? <Alert severity="info">Loading users…</Alert> : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead><TableRow><TableCell>User</TableCell><TableCell>Department</TableCell><TableCell>Role</TableCell><TableCell>Status</TableCell><TableCell>Last login</TableCell></TableRow></TableHead>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id} hover>
                                            <TableCell><Typography variant="body2" fontWeight={700}>{user.name}</Typography><Typography variant="caption" color="text.secondary">{user.email}</Typography></TableCell>
                                            <TableCell><TextField size="small" value={user.department || ''} placeholder="Unassigned" onChange={(e) => setUsers((current) => current.map((item) => item.id === user.id ? { ...item, department: e.target.value || null } : item))} onBlur={(e) => void updateUser(user.id, { department: e.target.value.trim() || null })} /></TableCell>
                                            <TableCell>
                                                <FormControl size="small" sx={{ minWidth: 190 }}><Select value={user.role} onChange={(e) => void updateUser(user.id, { role: e.target.value as PmsRole })}>
                                                    {PMS_ROLES.map((item) => <MenuItem key={item} value={item}>{ROLE_LABELS[item]}</MenuItem>)}
                                                </Select></FormControl>
                                            </TableCell>
                                            <TableCell><Stack direction="row" alignItems="center"><Switch checked={user.isActive} onChange={(e) => void updateUser(user.id, { isActive: e.target.checked })} /><Chip size="small" color={user.isActive ? 'success' : 'default'} label={user.isActive ? 'Active' : 'Disabled'} /></Stack></TableCell>
                                            <TableCell>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default AdminUsers;
