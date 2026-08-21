import bcrypt from 'bcryptjs';
import { FormalReportType, OperatorScope, PrismaClient, ReportTemplateStatus, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const username = process.env.ADMIN_USERNAME?.trim().toLowerCase() || null;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required to seed the first administrator');
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must contain at least 8 characters');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const administrator = await prisma.user.upsert({
    where: { email },
    update: {
      name: process.env.ADMIN_NAME || 'System Administrator',
      username,
      passwordHash,
      role: Role.ADMINISTRATOR,
      operatorScope: null,
      isActive: true,
      tokenVersion: { increment: 1 },
    },
    create: {
      name: process.env.ADMIN_NAME || 'System Administrator',
      username,
      email,
      passwordHash,
      role: Role.ADMINISTRATOR,
      operatorScope: null,
    },
  });

  const departmentalAccounts = [
    { scope: OperatorScope.SPOC, username: process.env.SPOC_ADMIN_USERNAME, password: process.env.SPOC_ADMIN_PASSWORD, name: 'SPOC Departmental Administrator' },
    { scope: OperatorScope.DPOC, username: process.env.DPOC_ADMIN_USERNAME, password: process.env.DPOC_ADMIN_PASSWORD, name: 'DPOC Departmental Administrator' },
    { scope: OperatorScope.GPOC, username: process.env.GPOC_ADMIN_USERNAME, password: process.env.GPOC_ADMIN_PASSWORD, name: 'GPOC Departmental Administrator' },
  ];

  for (const account of departmentalAccounts) {
    if (!account.username && !account.password) continue;
    if (!account.username || !account.password) {
      throw new Error(`${account.scope}_ADMIN_USERNAME and ${account.scope}_ADMIN_PASSWORD must be provided together`);
    }
    if (account.password.length < 8) throw new Error(`${account.scope}_ADMIN_PASSWORD must contain at least 8 characters`);

    const accountUsername = account.username.trim().toLowerCase();
    const accountEmail = `${accountUsername}@smart-oil-field.local`;
    await prisma.user.upsert({
      where: { username: accountUsername },
      update: {
        name: account.name,
        email: accountEmail,
        passwordHash: await bcrypt.hash(account.password, 12),
        role: Role.DEPARTMENT_HEAD,
        operatorScope: account.scope,
        department: `${account.scope} Administration`,
        isActive: true,
        tokenVersion: { increment: 1 },
      },
      create: {
        name: account.name,
        username: accountUsername,
        email: accountEmail,
        passwordHash: await bcrypt.hash(account.password, 12),
        role: Role.DEPARTMENT_HEAD,
        operatorScope: account.scope,
        department: `${account.scope} Administration`,
      },
    });
  }

  const reportTemplates: Array<{ code: string; name: string; type: FormalReportType; description: string; allowedRoles: Role[]; sections: string[] }> = [
    { code: 'PMS-PROJECT', name: 'Project Performance Report', type: FormalReportType.PROJECT, description: 'Formal project delivery, finance, results, risk, compliance, supply-chain, and training report.', allowedRoles: [Role.ADMINISTRATOR, Role.PROJECT_MANAGER, Role.DEPARTMENT_HEAD], sections: ['Executive summary', 'Delivery progress', 'Results and KPIs', 'Financial performance', 'Risks and issues', 'Compliance', 'Supply chain', 'Workforce capacity', 'Recommendations'] },
    { code: 'PMS-QUARTERLY', name: 'Quarterly Portfolio Report', type: FormalReportType.QUARTERLY, description: 'Quarterly enterprise performance and exception report.', allowedRoles: [Role.ADMINISTRATOR, Role.ME_OFFICER, Role.DEPARTMENT_HEAD], sections: ['Executive summary', 'Portfolio progress', 'Quarterly results', 'Financial position', 'Compliance exceptions', 'Supplier performance', 'Workforce capacity', 'Management actions'] },
    { code: 'PMS-ANNUAL', name: 'Annual Performance Report', type: FormalReportType.ANNUAL, description: 'Annual organizational results and accountability report.', allowedRoles: [Role.ADMINISTRATOR, Role.ME_OFFICER, Role.DEPARTMENT_HEAD], sections: ['Leadership statement', 'Annual performance', 'Results framework', 'Financial performance', 'Governance and compliance', 'Supply-chain performance', 'People and capacity', 'Outlook'] },
    { code: 'PMS-FINANCE', name: 'Financial Performance Report', type: FormalReportType.FINANCE, description: 'Controlled budget, commitment, expenditure, balance, and variance report.', allowedRoles: [Role.ADMINISTRATOR, Role.FINANCE_OFFICER, Role.DEPARTMENT_HEAD], sections: ['Financial overview', 'Budget position', 'Commitments', 'Expenditure', 'Variance analysis', 'Exceptions and controls', 'Recommendations'] },
    { code: 'PMS-COMPLIANCE', name: 'Compliance and Regulatory Report', type: FormalReportType.COMPLIANCE, description: 'Formal obligations, permits, inspections, findings, and corrective-action report.', allowedRoles: [Role.ADMINISTRATOR, Role.COMPLIANCE_OFFICER, Role.DEPARTMENT_HEAD], sections: ['Compliance overview', 'Obligations', 'Permits and licences', 'Inspections', 'Non-conformities', 'Corrective actions', 'Regulatory outlook'] },
    { code: 'PMS-SUPPLIER', name: 'Supplier Performance Report', type: FormalReportType.SUPPLIER, description: 'Formal qualification, contracting, delivery, HSE, local-content, and supplier scorecard report.', allowedRoles: [Role.ADMINISTRATOR, Role.SUPPLY_CHAIN_OFFICER, Role.DEPARTMENT_HEAD], sections: ['Supply-chain overview', 'Supplier status', 'Qualification', 'Contracts and procurement', 'Delivery performance', 'HSE and local content', 'Corrective actions'] },
    { code: 'PMS-TRAINING', name: 'Training and Capacity Report', type: FormalReportType.TRAINING, description: 'Formal competency, learning delivery, certification, effectiveness, and skills-gap report.', allowedRoles: [Role.ADMINISTRATOR, Role.DEPARTMENT_HEAD, Role.ME_OFFICER], sections: ['Workforce overview', 'Competency profile', 'Training delivery', 'Attendance and completion', 'Certification compliance', 'Effectiveness', 'Capacity plan'] },
    { code: 'PMS-DEPARTMENT', name: 'Department Performance Report', type: FormalReportType.DEPARTMENT, description: 'Department-scoped delivery, finance, results, compliance, suppliers, and workforce report.', allowedRoles: [Role.ADMINISTRATOR, Role.DEPARTMENT_HEAD, Role.ME_OFFICER], sections: ['Department overview', 'Project delivery', 'Results and KPIs', 'Financial performance', 'Compliance', 'Supply chain', 'Workforce capacity', 'Priorities'] },
    { code: 'PMS-EXECUTIVE', name: 'Executive Performance Brief', type: FormalReportType.EXECUTIVE, description: 'Concise enterprise scorecard, strategic exceptions, and decisions report.', allowedRoles: [Role.ADMINISTRATOR, Role.DEPARTMENT_HEAD], sections: ['Executive summary', 'Enterprise scorecard', 'Strategic delivery', 'Financial position', 'Material risks', 'Compliance and assurance', 'Decisions required'] },
  ];

  for (const template of reportTemplates) {
    await prisma.formalReportTemplate.upsert({
      where: { code: template.code },
      update: { name: template.name, type: template.type, description: template.description, allowedRoles: template.allowedRoles, sections: template.sections, status: ReportTemplateStatus.ACTIVE },
      create: { ...template, isSystem: true, status: ReportTemplateStatus.ACTIVE, createdById: administrator.id, reviewComment: 'Secure system seed template' },
    });
  }

  console.log(`Seeded administrator and ${reportTemplates.length} controlled report templates: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
