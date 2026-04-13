import { MikroORM, EntityManager } from '@mikro-orm/postgresql';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcrypt';
import config from '../mikro-orm.config';
import { PERMISSIONS } from './permissions.seed';
import { PlanTier, TrackableStatus, WorkflowItemStatus, WorkflowItemType } from '@tracker/shared';

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
    p.code.includes(':read') || p.code.includes(':create') || p.code === 'workflow:review',
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

  console.log('Creating trackables with workflow items...');
  const now = new Date();

  for (let t = 0; t < 15; t++) {
    const trackable = em.create('Trackable', {
      title: `Trackable ${String(t + 1).padStart(3, '0')} - ${TRACKABLE_TYPES[t % TRACKABLE_TYPES.length]}`,
      type: TRACKABLE_TYPES[t % TRACKABLE_TYPES.length],
      status: STATUSES_TRACKABLE[t % STATUSES_TRACKABLE.length],
      description: `Description for trackable ${t + 1}`,
      organization: org,
      createdBy: createdUsers[0],
      assignedTo: createdUsers[t % createdUsers.length],
      startDate: new Date(now.getTime() - t * 7 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + (30 - t * 2) * 24 * 60 * 60 * 1000),
    });

    const folder = em.create('Folder', {
      name: (trackable as any).title,
      trackable,
      organization: org,
    });

    const serviceCount = 2 + (t % 2);
    for (let s = 0; s < serviceCount; s++) {
      const service = em.create('WorkflowItem', {
        trackable,
        title: `Service ${s + 1}: Phase ${['Planning', 'Execution', 'Review'][s % 3]}`,
        itemType: 'service',
        status: s === 0 ? 'closed' : s === 1 ? 'in_progress' : 'pending',
        depth: 0,
        sortOrder: s,
        organization: org,
        assignedTo: createdUsers[s % createdUsers.length],
        startDate: new Date(now.getTime() + s * 10 * 24 * 60 * 60 * 1000),
        dueDate: new Date(now.getTime() + (s + 1) * 10 * 24 * 60 * 60 * 1000),
      });

      const taskCount = 2 + (s % 2);
      for (let tk = 0; tk < taskCount; tk++) {
        const task = em.create('WorkflowItem', {
          trackable,
          parent: service,
          title: `Task ${s + 1}.${tk + 1}: ${['Research', 'Draft', 'Validate', 'Submit'][tk % 4]}`,
          itemType: 'task',
          status: STATUSES_ITEM[(s * 2 + tk) % STATUSES_ITEM.length],
          depth: 1,
          sortOrder: tk,
          organization: org,
          assignedTo: createdUsers[(s + tk) % createdUsers.length],
          dueDate: new Date(now.getTime() + (s * 10 + tk * 3) * 24 * 60 * 60 * 1000),
        });

        const actionCount = 1 + (tk % 2);
        for (let a = 0; a < actionCount; a++) {
          em.create('WorkflowItem', {
            trackable,
            parent: task,
            title: `Action ${s + 1}.${tk + 1}.${a + 1}: ${['Create document', 'Upload file', 'Review'][a % 3]}`,
            itemType: 'action',
            actionType: ['doc_creation', 'doc_upload', 'approval'][a % 3],
            status: STATUSES_ITEM[(s + tk + a) % STATUSES_ITEM.length],
            depth: 2,
            sortOrder: a,
            organization: org,
            assignedTo: createdUsers[(s + tk + a) % createdUsers.length],
            requiresDocument: a % 2 === 0,
            dueDate: new Date(now.getTime() + (s * 10 + tk * 3 + a) * 24 * 60 * 60 * 1000),
          });
        }
      }
    }
  }

  await em.flush();

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
