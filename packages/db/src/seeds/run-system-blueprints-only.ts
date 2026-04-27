import { MikroORM } from '@mikro-orm/postgresql';
import config from '../mikro-orm.config';
import { seedSystemBlueprints } from './seed-system-blueprints';

async function main() {
  const orm = await MikroORM.init(config);
  const em = orm.em.fork();
  await seedSystemBlueprints(em);
  await orm.close();
  console.log('seed:system-blueprints OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
