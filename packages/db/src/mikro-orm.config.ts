import { defineConfig } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import { Migrator } from '@mikro-orm/migrations';
import { SeedManager } from '@mikro-orm/seeder';
import { UnderscoreNamingStrategy } from '@mikro-orm/core';
import 'dotenv/config';

export default defineConfig({
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT) || 5432,
  dbName: process.env.DATABASE_NAME || 'tracker_db',
  user: process.env.DATABASE_USER || 'tracker_user',
  password: process.env.DATABASE_PASSWORD || 'tracker_pass',
  entities: ['./dist/entities/**/*.js'],
  entitiesTs: ['./src/entities/**/*.ts'],
  metadataProvider: TsMorphMetadataProvider,
  namingStrategy: UnderscoreNamingStrategy,
  extensions: [Migrator, SeedManager],
  migrations: {
    path: './src/migrations',
    pathTs: './src/migrations',
    glob: '!(*.d).{js,ts}',
    transactional: true,
    allOrNothing: true,
  },
  seeder: {
    path: './src/seeds',
    pathTs: './src/seeds',
  },
  debug: process.env.NODE_ENV === 'development',
});
