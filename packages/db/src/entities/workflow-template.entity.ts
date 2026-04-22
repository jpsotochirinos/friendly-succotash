import {
  Entity,
  Property,
  Enum,
  ManyToOne,
  OneToMany,
  Collection,
  Index,
  OptionalProps,
} from '@mikro-orm/core';
import { BaseEntity } from './base.entity';
import { MatterType } from '@tracker/shared';
import type { Organization } from './organization.entity';
import type { WorkflowTemplateItem } from './workflow-template-item.entity';

/** Plantilla reutilizable de flujo (catálogo sistema o del despacho). */
@Entity({ tableName: 'workflow_templates' })
@Index({ properties: ['matterType'] })
export class WorkflowTemplate extends BaseEntity {
  [OptionalProps]?: 'jurisdiction' | 'isSystem' | 'category';

  @Property({ length: 500 })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Enum({ items: () => MatterType })
  matterType!: MatterType;

  @Property({ length: 120, nullable: true })
  category?: string;

  @Property({ length: 8, default: 'PE' })
  jurisdiction: string = 'PE';

  @Property({ default: false })
  isSystem: boolean = false;

  /** Null = plantilla global del sistema; si no, pertenece al despacho. */
  @ManyToOne('Organization', { nullable: true })
  organization?: Organization;

  @OneToMany('WorkflowTemplateItem', 'template')
  items = new Collection<WorkflowTemplateItem>(this);
}
