# PMS project management

## Domain boundary

PMS projects represent planned organizational work, accountability, dates, progress, expected results, risks, and assigned people. Oil batches represent physical petroleum movement, lifecycle stages, quality, custody, and blockchain provenance. The two domains remain separate so future supply-chain links do not distort project reporting.

## Project record

Each project stores:

- Unique project code and title
- Department and location
- Project Manager
- Start and end dates
- Status and progress percentage
- Objectives
- Activities and activity progress
- Milestones and due dates
- Deliverables and acceptance state
- Risks, severity, mitigation, status, and owner
- Assigned staff and project responsibility

## Permissions

| Role | Read | Create | Manage | Delete project |
|---|---:|---:|---:|---:|
| Administrator | Yes | Yes | All | Yes |
| Department Head | Yes | Yes | All | No |
| Project Manager | Yes | Own projects | Own projects | No |
| M&E, Compliance, Finance, Supply Chain, Viewer | Yes | No | No | No |

“Own projects” means the user is the designated `managerId`. A Project Manager cannot create a project for another manager or reassign their project.

## API

- `GET /api/projects` — search and filter projects
- `GET /api/projects/options` — active users and department options
- `POST /api/projects` — create a project
- `GET /api/projects/:projectId` — retrieve the complete project record
- `PATCH /api/projects/:projectId` — update project details, status, and progress
- `DELETE /api/projects/:projectId` — Administrator-only project deletion
- Nested `POST`, `PATCH`, and `DELETE` routes manage objectives, activities, milestones, deliverables, and risks
- `POST /api/projects/:projectId/assignments` and `DELETE /api/projects/:projectId/assignments/:userId` manage assigned staff

Every write is checked against the current PostgreSQL user and JWT identity. Project creation, updates, and deletion are recorded in the PMS audit log.

## Database migration

Development:

```powershell
npm run db:migrate
```

Deployment:

```powershell
npm run db:migrate:deploy
```

The migration is `20260806100000_project_management`.
