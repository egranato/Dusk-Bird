import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Tag } from '../../tags/entities/tag.entity';

export enum MediaVisibility {
  Private = 'private',
  Public = 'public',
}

export enum MediaKind {
  Media = 'media',
  File = 'file',
}

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploader_id' })
  uploader: User;

  @Column({ name: 'uploader_id' })
  uploaderId: string;

  @Column({ name: 'object_key', unique: true })
  objectKey: string;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'mime_type', length: 127, nullable: true })
  mimeType: string;

  @Column({ name: 'size_bytes', type: 'bigint', default: 0 })
  sizeBytes: number;

  @Column({ name: 'content_hash', type: 'varchar', length: 64, nullable: true, unique: true })
  contentHash: string;

  @Column({ name: 'thumbnail_key', type: 'text', nullable: true })
  thumbnailKey: string;

  @Column({ type: 'varchar', length: 10, default: MediaVisibility.Private })
  visibility: MediaVisibility;

  @Column({ type: 'varchar', length: 10, default: MediaKind.Media })
  kind: MediaKind;

  @ManyToMany(() => Tag, (tag) => tag.media, { eager: false })
  @JoinTable({
    name: 'media_tags',
    joinColumn: { name: 'media_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: Tag[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
