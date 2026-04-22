import { MikroORM, EntityManager } from '@mikro-orm/postgresql';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcrypt';
import config from '../mikro-orm.config';
import { PERMISSIONS } from './permissions.seed';
import { PlanTier, TrackableStatus, WorkflowItemStatus, MatterType, ActionType } from '@tracker/shared';
import { WorkflowDefinition, WorkflowState } from '../entities';
import { seedLegalSystemTemplates } from './legal-templates.seed';
import { seedSystemWorkflows } from './workflows.seed';

const TRACKABLE_TYPES = ['project', 'case', 'process', 'audit'];
const STATUSES_TRACKABLE = ['created', 'active', 'under_review', 'completed'];
const STATUSES_ITEM = ['pending', 'active', 'in_progress', 'under_review', 'validated', 'closed'];

async function seed() {
  const orm = await MikroORM.init(config);
  const em = orm.em.fork();

  console.log('Seeding permissions...');
  for (const perm of PERMISSIONS) {
    const existing = await em.findOne('Permission', { code: perm.code });
    if (!existing) em.create('Permission', perm);
  }
  await em.flush();
  const allPermissions = await em.findAll('Permission');

  console.log('Creating organization...');
  const org = em.create('Organization', {
    id: uuid(),
    name: 'Demo Organization',
    planTier: PlanTier.FREE,
    settings: { timezone: 'America/Lima', language: 'es', onboardingCompleted: true },
    isActive: true,
    featureFlags: { useConfigurableWorkflows: true },
  });
  await em.flush();

  console.log('Creating roles...');
  const ownerRole = em.create('Role', {
    name: 'Owner', description: 'Full access', isSystem: true, organization: org,
  });
  (ownerRole as any).permissions.set(allPermissions);

  const operatorRole = em.create('Role', {
    name: 'Senior Operator', description: 'Operational access', isSystem: true, organization: org,
  });
  const operatorPerms = allPermissions.filter((p: any) =>
    !['org:manage', 'role:manage'].includes(p.code),
  );
  (operatorRole as any).permissions.set(operatorPerms);

  const juniorRole = em.create('Role', {
    name: 'Junior Operator', description: 'Basic access', isSystem: true, organization: org,
  });
  const juniorPerms = allPermissions.filter((p: any) =>
    p.code.includes(':read') ||
      p.code.includes(':create') ||
      p.code === 'workflow:review' ||
      p.code === 'workflow_item:comment' ||
      (typeof p.code === 'string'
        && p.code.startsWith('whatsapp:')
        && p.code !== 'whatsapp:send_to_others'),
  );
  (juniorRole as any).permissions.set(juniorPerms);
  await em.flush();

  console.log('Creating users...');
  const passwordHash = await bcrypt.hash('password123', 12);

  const users = [
    { email: 'owner@demo.com', firstName: 'Carlos', lastName: 'Rodríguez', role: ownerRole },
    { email: 'senior@demo.com', firstName: 'María', lastName: 'García', role: operatorRole },
    { email: 'junior1@demo.com', firstName: 'Luis', lastName: 'Mendoza', role: juniorRole },
    { email: 'junior2@demo.com', firstName: 'Ana', lastName: 'Torres', role: juniorRole },
    { email: 'assistant@demo.com', firstName: 'Pedro', lastName: 'Vargas', role: juniorRole },
  ];

  const createdUsers: any[] = [];
  for (const u of users) {
    const user = em.create('User', {
      ...u, passwordHash, organization: org, isActive: true,
    });
    createdUsers.push(user);
  }
  await em.flush();

  console.log('Creating demo clients...');
  const demoClientNames = ['Acme Corp', 'Globex SL', 'Umbrella SA'];
  const demoClients: unknown[] = [];
  for (const name of demoClientNames) {
    demoClients.push(em.create('Client', { name, organization: org } as any));
  }
  await em.flush();

  console.log('Creating trackables with workflow items...');
  await seedSystemWorkflows(em);
  const wfJudicial = await em.findOne(WorkflowDefinition, {
    slug: 'standard-judicial-pe',
    isSystem: true,
    organization: null,
  });
  const wfOffice = await em.findOne(WorkflowDefinition, {
    slug: 'standard-office',
    isSystem: true,
    organization: null,
  });
  const statesJud = await em.find(WorkflowState, { workflow: wfJudicial! });
  const statesOff = await em.find(WorkflowState, { workflow: wfOffice! });
  const stMapJud = new Map(statesJud.map((s) => [s.key, s]));
  const stMapOff = new Map(statesOff.map((s) => [s.key, s]));

  const wiWorkflowState = (matter: MatterType, statusKey: string) => {
    const wf = matter === MatterType.LITIGATION ? wfJudicial! : wfOffice!;
    const map = matter === MatterType.LITIGATION ? stMapJud : stMapOff;
    const st =
      map.get(statusKey as WorkflowItemStatus) ?? map.get(WorkflowItemStatus.PENDING)!;
    return { workflow: wf, currentState: st };
  };

  const now = new Date();

  for (let t = 0; t < 15; t++) {
    const trackable = em.create('Trackable', {
      title: `Trackable ${String(t + 1).padStart(3, '0')} - ${TRACKABLE_TYPES[t % TRACKABLE_TYPES.length]}`,
      type: TRACKABLE_TYPES[t % TRACKABLE_TYPES.length],
      matterType: t % 3 === 0 ? MatterType.LITIGATION : MatterType.OTHER,
      status: STATUSES_TRACKABLE[t % STATUSES_TRACKABLE.length],
      description: `Description for trackable ${t + 1}`,
      organization: org,
      createdBy: createdUsers[0],
      assignedTo: createdUsers[t % createdUsers.length],
      client: demoClients[t % demoClients.length] as any,
      startDate: new Date(now.getTime() - t * 7 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + (30 - t * 2) * 24 * 60 * 60 * 1000),
    });

    const folder = em.create('Folder', {
      name: (trackable as any).title,
      trackable,
      organization: org,
    });

    let wiSeq = 0;
    const serviceCount = 2 + (t % 2);
    for (let s = 0; s < serviceCount; s++) {
      wiSeq += 1;
      const sk0 = s === 0 ? 'closed' : s === 1 ? 'in_progress' : 'pending';
      const wfs0 = wiWorkflowState((trackable as any).matterType, sk0);
      const service = em.create('WorkflowItem', {
        trackable,
        title: `Service ${s + 1}: Phase ${['Planning', 'Execution', 'Review'][s % 3]}`,
        kind: 'Fase',
        workflow: wfs0.workflow,
        currentState: wfs0.currentState,
        depth: 0,
        sortOrder: s,
        itemNumber: wiSeq,
        organization: org,
        assignedTo: createdUsers[s % createdUsers.length],
        startDate: new Date(now.getTime() + s * 10 * 24 * 60 * 60 * 1000),
        dueDate: new Date(now.getTime() + (s + 1) * 10 * 24 * 60 * 60 * 1000),
      } as any);

      const taskCount = 2 + (s % 2);
      for (let tk = 0; tk < taskCount; tk++) {
        wiSeq += 1;
        const sk1 = STATUSES_ITEM[(s * 2 + tk) % STATUSES_ITEM.length];
        const wfs1 = wiWorkflowState((trackable as any).matterType, sk1);
        const task = em.create('WorkflowItem', {
          trackable,
          parent: service,
          title: `Task ${s + 1}.${tk + 1}: ${['Research', 'Draft', 'Validate', 'Submit'][tk % 4]}`,
          kind: 'Actuacion',
          workflow: wfs1.workflow,
          currentState: wfs1.currentState,
          depth: 1,
          sortOrder: tk,
          itemNumber: wiSeq,
          organization: org,
          assignedTo: createdUsers[(s + tk) % createdUsers.length],
          dueDate: new Date(now.getTime() + (s * 10 + tk * 3) * 24 * 60 * 60 * 1000),
        } as any);

        const actionCount = 1 + (tk % 2);
        for (let a = 0; a < actionCount; a++) {
          wiSeq += 1;
          const wfa = wiWorkflowState((trackable as any).matterType, STATUSES_ITEM[(s + tk + a) % STATUSES_ITEM.length]);
          em.create('WorkflowItem', {
            trackable,
            parent: task,
            title: `Action ${s + 1}.${tk + 1}.${a + 1}: ${['Create document', 'Upload file', 'Review'][a % 3]}`,
            kind: 'Diligencia',
            actionType: [ActionType.DOC_CREATION, ActionType.DOC_UPLOAD, ActionType.APPROVAL][a % 3],
            workflow: wfa.workflow,
            currentState: wfa.currentState,
            depth: 2,
            sortOrder: a,
            itemNumber: wiSeq,
            organization: org,
            assignedTo: createdUsers[(s + tk + a) % createdUsers.length],
            requiresDocument: a % 2 === 0,
            dueDate: new Date(now.getTime() + (s * 10 + tk * 3 + a) * 24 * 60 * 60 * 1000),
          } as any);
        }
      }
    }
  }

  await em.flush();

  console.log('Seeding legal workflow templates...');
  await seedLegalSystemTemplates(em);

  const trackableCount = await em.count('Trackable', {}, { filters: false });
  const itemCount = await em.count('WorkflowItem', {}, { filters: false });
  const userCount = await em.count('User', {}, { filters: false });

  console.log(`Seed complete:`);
  console.log(`  - ${userCount} users`);
  console.log(`  - ${trackableCount} trackables`);
  console.log(`  - ${itemCount} workflow items`);

  await orm.close();
}

seed().catch(console.error);
