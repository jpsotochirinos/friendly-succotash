import { MikroORM } from '@mikro-orm/postgresql';
import config from '../mikro-orm.config';
import { seedLegalProcessTemplates } from './legal-process-templates.seed';

async function main() {
  const orm = await MikroORM.init(config);
  const em = orm.em.fork();
  await seedLegalProcessTemplates(em);
  await orm.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
