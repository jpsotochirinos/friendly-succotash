import { MikroORM } from '@mikro-orm/postgresql';
import config from '../mikro-orm.config';
import { seedLegalSystemTemplates } from './legal-templates.seed';
import { seedSystemWorkflows } from './workflows.seed';

async function main() {
  const orm = await MikroORM.init(config);
  const em = orm.em.fork();
  try {
    await seedSystemWorkflows(em);
    await seedLegalSystemTemplates(em);
  } finally {
    await orm.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
