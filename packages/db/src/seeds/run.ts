import { MikroORM } from '@mikro-orm/postgresql';
import config from '../mikro-orm.config';
import { Permission } from '../entities/permission.entity';
import { PERMISSIONS } from './permissions.seed';

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

  await orm.close();
}

seed().catch(console.error);
