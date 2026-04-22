import { Entity, Property, ManyToOne, Index } from '@mikro-orm/core';
import { TenantBaseEntity } from './tenant-base.entity';
import type { SinoeNotification } from './sinoe-notification.entity';
import type { Document } from './document.entity';

@Entity({ tableName: 'sinoe_attachments' })
@Index({ properties: ['notification'] })
export class SinoeAttachment extends TenantBaseEntity {
  @ManyToOne('SinoeNotification', { nullable: false })
  notification!: SinoeNotification;

  @Property({ type: 'text' })
  tipo!: string;

  @Property({ type: 'text' })
  identificacionAnexo!: string;

  @Property({ type: 'text' })
  nroPaginas!: string;

  @Property({ type: 'text' })
  pesoArchivo!: string;

  @ManyToOne('Document', { nullable: true })
  document?: Document;

  @Property({ length: 64, nullable: true })
  sha256?: string;

  /** Tamaño en bytes (string para compatibilidad con enteros grandes). */
  @Property({ length: 32, nullable: true })
  sizeBytes?: string;
}
