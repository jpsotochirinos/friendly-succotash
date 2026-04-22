# Migración asistida (SFTP / bucket / disco)

Para proyectos **>50 GB** o políticas de red restrictivas:

1. El cliente sube a un **bucket S3 compatible** (o SFTP) en la misma región que el worker.
2. Un job `import-assisted-ingest` (a implementar) lista el prefijo, copia a `staging/org-{orgId}/batch-{batchId}/`, crea `ImportItem` y encola `import-analyze`.
3. Registre `adapterId` en `ImportBatch.config` apuntando a un adaptador en `adapters/` (p. ej. `assisted-stub`).

Variables sugeridas: `ASSISTED_IMPORT_BUCKET`, `ASSISTED_IMPORT_PREFIX`, credenciales en secret manager.
