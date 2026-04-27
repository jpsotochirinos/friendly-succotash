import { MikroORM } from '@mikro-orm/postgresql';
import config from '../mikro-orm.config';
import { Permission } from '../entities/permission.entity';
import { PERMISSIONS } from './permissions.seed';
import { seedLegalProcessTemplates } from './legal-process-templates.seed';
import { seedSystemBlueprints } from './seed-system-blueprints';

async function seed() {
  const orm = await MikroORM.init(config);
  const em = orm.em.fork();

  console.log('Seeding permissions...');
  for (const perm of PERMISSIONS) {
    const existing = await em.findOne(Permission, { code: perm.code });
    if (!existing) {
      em.create(Permission, perm);
    }
  }
  await em.flush();
  console.log(`Seeded ${PERMISSIONS.length} permissions`);

  console.log('Seeding legal process templates...');
  await seedLegalProcessTemplates(em);
  console.log('Legal process templates done');

  console.log('Seeding system blueprints (v2 engine)...');
  try {
    await seedSystemBlueprints(em);
    console.log('System blueprints done');
  } catch (e) {
    console.warn('System blueprints skipped (run migrations first?):', (e as Error).message);
  }

  await orm.close();
}

seed().catch(console.error);
