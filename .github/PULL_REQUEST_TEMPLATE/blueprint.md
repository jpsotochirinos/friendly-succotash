## Tipo de PR

- [ ] Nuevo/actualización de **Blueprint** (plantilla de sistema) — **requiere** revisión legal
- [ ] Código/infra sin cambio de plazos o etapas legales

## Blueprint (si aplica)

- **Código del blueprint (slug):** `________`
- **Versión publicada o propuesta:** `v__`
- **Jurisdicción / ley de referencia:** (ej. CPC, CC, PE)

## Revisión legal (obligatoria para semillas o cambios estructurales de blueprints de sistema)

- [ ] Revisó un abogado del equipo o asesor designado: **________**
- [ ] Plazos y artículos citados en `DeadlineRule` / changelog han sido **verificados** para la rama (civil, familia, etc.)
- [ ] `changelog` de `BlueprintVersion` describe el “por qué” del cambio (ley nueva, errata, ajuste de política de la firma en tenant, no en SYSTEM)

## Pruebas

- [ ] `pnpm --filter @tracker/db migrate` aplicado en local
- [ ] `pnpm test` (o subset relevante) pasa
- [ ] Resolución de snapshot / resolver probada si el PR toca overrides o versiones

## Notas

(riesgos, pendientes, migración de datos)
