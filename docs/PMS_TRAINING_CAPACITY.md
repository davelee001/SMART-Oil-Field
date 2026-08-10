# PMS Training and Capacity Building

## Scope

Phase 8 introduces a governed workforce-development module without changing telemetry, oil movement, analytics, machine learning, blockchain, subscriptions, finance, compliance, supply chain, or KPI behavior. PostgreSQL remains the PMS system of record.

The protected `/training` workspace and `/api/training` API cover:

- staff departments and competency profiles with current and target proficiency levels;
- a course catalogue with delivery mode, duration, provider, cost, currency, validity, and mandatory status;
- course-to-competency mappings and role/department training requirements;
- project-linked training sessions, capacity, planned and actual costs, coordinators, and approval history;
- participant nominations, daily attendance, pre/post/follow-up assessments, completion, and learning effectiveness;
- independently verified certifications, computed expiry, renewal visibility, and secure evidence references;
- compliance, skills-gap, completion, training-hour, effectiveness, and cost analytics;
- an authenticated, non-cacheable workforce compliance CSV export.

## Authorization and workflow

All authenticated users may read the training register and portfolio summary.

- Administrators and Department Heads govern competencies, staff assessments, courses, requirements, session decisions, and certifications.
- Project Managers may create and coordinate their own training sessions, nominate participants, record attendance and assessments, and complete eligible enrollments. A linked project must be one they manage.
- Other authenticated roles have reporting access.

Session approval uses a four-eyes control: a submitter cannot approve the same session. Returned drafts clear old review metadata before resubmission. Certificate verification uses the same separation of duties: an issuer cannot verify their own certificate.

## Completion and certification controls

- Approved or scheduled sessions alone accept nominations.
- Active nominations cannot exceed session capacity.
- Attendance dates must fall inside the session dates.
- Present attendance counts fully and partial attendance counts at 50 percent.
- Completion requires at least 75 percent attendance and a post-training assessment.
- Certifications linked to an enrollment require that the same staff member completed it.
- The certificate course must match the enrollment course.
- If a course defines validity and no expiry is supplied, the API derives expiry from the issue date.
- Only independently verified, unexpired certifications satisfy course requirements.

## Data integrity and evidence

Migration `20260810092541_training_capacity_building` adds the training models, enums, indexes, relations, department field, and PostgreSQL checks for dates, capacity, non-negative cost, valid proficiency and score ranges, one-parent evidence, and four-eyes separation.

Evidence is stored as a secure reference rather than an uploaded binary. Production evidence URLs must use HTTPS; localhost HTTP is accepted for development. Each evidence record belongs to exactly one competency profile, session, enrollment, assessment, or certification.

## API summary

| Endpoint | Purpose |
|---|---|
| `GET /api/training/overview` | Portfolio metrics and compliance summary |
| `GET /api/training/register` | Courses, competencies, requirements, sessions, certificates, and workflow |
| `GET /api/training/options` | Authorized form reference data |
| `POST /api/training/courses` | Create a governed course |
| `POST /api/training/courses/:courseId/competencies` | Map a competency outcome |
| `POST /api/training/competencies` | Define a competency |
| `PUT /api/training/staff-competencies` | Assess a staff competency profile |
| `POST /api/training/requirements` | Define a role/department requirement |
| `POST /api/training/sessions` | Plan a session |
| `POST /api/training/sessions/:id/submit` | Submit a draft for review |
| `POST /api/training/sessions/:id/decision` | Independently approve or return a session |
| `POST /api/training/sessions/:sessionId/enrollments` | Nominate a participant |
| `PUT /api/training/enrollments/:id/attendance` | Record daily attendance |
| `PUT /api/training/enrollments/:id/assessments` | Record an assessment |
| `POST /api/training/enrollments/:id/complete` | Complete an eligible enrollment |
| `POST /api/training/certifications` | Issue a certificate |
| `POST /api/training/certifications/:id/verify` | Independently verify a certificate |
| `POST /api/training/evidence` | Attach a secure evidence reference |
| `GET /api/training/reports/compliance.csv` | Export workforce compliance |

## Operations

Apply the database change with:

```bash
npm run db:migrate:deploy
```

Validate the module and regression suite with:

```bash
npm test
npm run typecheck
npm run build
```

The module does not introduce formal signed report templates; those remain Phase 9 scope.
