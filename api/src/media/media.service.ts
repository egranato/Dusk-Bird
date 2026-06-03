import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import * as archiver from 'archiver';
import { Response } from 'express';
import sharp from 'sharp';
import { Media } from './entities/media.entity';
import { MinioService } from './minio.service';
import { Tag } from '../tags/entities/tag.entity';
import { TagsService } from '../tags/tags.service';
import { BrowseMediaDto } from './dto/browse-media.dto';
import { BulkDownloadDto } from './dto/bulk-download.dto';
import { PaginatedMediaResponseDto, MediaResponseDto } from './dto/media-response.dto';
import { Role } from '../common/types/role.enum';
import { JwtPayload } from '../common/types/jwt-payload.type';

const ALLOWED_MIME_PREFIXES = ['image/', 'video/'];

type TagRow = { media_id: string; tag_id: string; name: string; slug: string };

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepo: Repository<Media>,
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
    private readonly minioService: MinioService,
    private readonly tagsService: TagsService,
  ) {}

  private async loadTagsForMedia(
    mediaIds: string[],
  ): Promise<Map<string, Array<{ id: string; name: string; slug: string }>>> {
    const map = new Map<string, Array<{ id: string; name: string; slug: string }>>();
    if (mediaIds.length === 0) return map;

    const rows: TagRow[] = await this.mediaRepo.query(
      `SELECT mt.media_id, t.id AS tag_id, t.name, t.slug
       FROM media_tags mt
       JOIN tags t ON t.id = mt.tag_id
       WHERE mt.media_id = ANY($1)`,
      [mediaIds],
    );

    for (const row of rows) {
      if (!map.has(row.media_id)) map.set(row.media_id, []);
      map.get(row.media_id)!.push({ id: row.tag_id, name: row.name, slug: row.slug });
    }
    return map;
  }

  private async filterIdsByTags(slugs: string[], mode: 'and' | 'or' = 'and'): Promise<string[]> {
    if (mode === 'or') {
      const rows: { media_id: string }[] = await this.mediaRepo.query(
        `SELECT DISTINCT mt.media_id
         FROM media_tags mt
         JOIN tags t ON t.id = mt.tag_id
         WHERE t.slug = ANY($1)`,
        [slugs],
      );
      return rows.map((r) => r.media_id);
    }
    const rows: { media_id: string }[] = await this.mediaRepo.query(
      `SELECT mt.media_id
       FROM media_tags mt
       JOIN tags t ON t.id = mt.tag_id
       WHERE t.slug = ANY($1)
       GROUP BY mt.media_id
       HAVING COUNT(DISTINCT t.slug) = $2`,
      [slugs, slugs.length],
    );
    return rows.map((r) => r.media_id);
  }

  private toDto(
    m: Media,
    tags: Array<{ id: string; name: string; slug: string }>,
  ): MediaResponseDto {
    return {
      id: m.id,
      uploaderId: m.uploaderId,
      fileName: m.fileName,
      mimeType: m.mimeType,
      sizeBytes: Number(m.sizeBytes),
      tags,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }

  private async generateThumbnail(
    buffer: Buffer,
    uploaderId: string,
  ): Promise<string | null> {
    try {
      const thumbBuffer = await sharp(buffer)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const thumbnailKey = `thumbnails/${uploaderId}/${uuidv4()}_thumb.jpg`;
      const { Readable } = await import('stream');
      await this.minioService.putObject(
        thumbnailKey,
        Readable.from(thumbBuffer),
        thumbBuffer.length,
        'image/jpeg',
      );
      return thumbnailKey;
    } catch (err) {
      this.logger.warn(`Thumbnail generation failed: ${(err as Error).message}`);
      return null;
    }
  }

  async upload(file: Express.Multer.File, uploaderId: string): Promise<Media> {
    const mimeType = file.mimetype;
    if (!ALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p))) {
      throw new UnsupportedMediaTypeException('Only image and video files are allowed');
    }

    const contentHash = createHash('sha256').update(file.buffer).digest('hex');

    const existing = await this.mediaRepo.findOne({ where: { contentHash } });
    if (existing) {
      throw new ConflictException({
        message: 'This file has already been uploaded',
        existingId: existing.id,
      });
    }

    const ext = extname(file.originalname) || '';
    const objectKey = `media/${uploaderId}/${uuidv4()}${ext}`;

    const { Readable } = await import('stream');
    await this.minioService.putObject(
      objectKey,
      Readable.from(file.buffer),
      file.size,
      mimeType,
    );

    const thumbnailKey = mimeType.startsWith('image/')
      ? await this.generateThumbnail(file.buffer, uploaderId)
      : null;

    try {
      const media = this.mediaRepo.create({
        uploaderId,
        objectKey,
        thumbnailKey: thumbnailKey ?? undefined,
        fileName: file.originalname,
        mimeType,
        sizeBytes: file.size,
        contentHash,
      });
      return await this.mediaRepo.save(media);
    } catch (err) {
      await this.minioService.removeObject(objectKey).catch(() => undefined);
      if (thumbnailKey) {
        await this.minioService.removeObject(thumbnailKey).catch(() => undefined);
      }
      throw err;
    }
  }

  async browse(dto: BrowseMediaDto): Promise<PaginatedMediaResponseDto> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 50;
    const skip = (page - 1) * limit;

    // Build candidate ID set from filters (null = no restriction).
    let candidateIds: string[] | null = null;

    const tagSlugs = dto.tags
      ? dto.tags.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    if (tagSlugs.length > 0) {
      const ids = await this.filterIdsByTags(tagSlugs, dto.mode ?? 'and');
      if (ids.length === 0) return { data: [], total: 0, page, limit };
      candidateIds = ids;
    }

    if (dto.maxTags !== undefined) {
      const rows: { id: string }[] = await this.mediaRepo.query(
        `SELECT m.id FROM media m
         LEFT JOIN media_tags mt ON mt.media_id = m.id
         GROUP BY m.id
         HAVING COUNT(mt.tag_id) <= $1`,
        [dto.maxTags],
      );
      const maxTagIds = rows.map((r) => r.id);
      if (maxTagIds.length === 0) return { data: [], total: 0, page, limit };
      if (candidateIds) {
        const set = new Set(maxTagIds);
        candidateIds = candidateIds.filter((id) => set.has(id));
        if (candidateIds.length === 0) return { data: [], total: 0, page, limit };
      } else {
        candidateIds = maxTagIds;
      }
    }

    // Apply exclude filter.
    const excludeSlugs = dto.excludeTags
      ? dto.excludeTags.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    let excludedIds: Set<string> | null = null;

    if (excludeSlugs.length > 0) {
      const exRows: { media_id: string }[] = await this.mediaRepo.query(
        `SELECT DISTINCT mt.media_id
         FROM media_tags mt
         JOIN tags t ON t.id = mt.tag_id
         WHERE t.slug = ANY($1)`,
        [excludeSlugs],
      );
      excludedIds = new Set(exRows.map((r) => r.media_id));

      if (candidateIds) {
        candidateIds = candidateIds.filter((id) => !excludedIds!.has(id));
        if (candidateIds.length === 0) return { data: [], total: 0, page, limit };
      }
    }

    // Build final where conditions.
    let whereCondition: object = {};
    if (candidateIds) {
      whereCondition = { id: In(candidateIds) };
    } else if (excludedIds && excludedIds.size > 0) {
      whereCondition = { id: Not(In([...excludedIds])) };
    }

    const whereClause = candidateIds ? `WHERE id = ANY($1)` : '';
    const baseParams: unknown[] = candidateIds ? [candidateIds] : [];

    if (dto.sort === 'random') {
      const p = baseParams.length;
      const rows: { id: string }[] = await this.mediaRepo.query(
        `SELECT id FROM media ${whereClause} ORDER BY RANDOM() LIMIT $${p + 1} OFFSET $${p + 2}`,
        [...baseParams, limit, skip],
      );
      const countRows: { count: string }[] = await this.mediaRepo.query(
        `SELECT COUNT(*) FROM media ${whereClause}`,
        baseParams,
      );
      const total = parseInt(countRows[0].count, 10);
      if (rows.length === 0) return { data: [], total, page, limit };

      // For random with excludedIds (no candidateIds): filter after the query.
      let orderedIds = rows.map((r) => r.id);
      if (excludedIds && !candidateIds) {
        orderedIds = orderedIds.filter((id) => !excludedIds!.has(id));
      }
      if (orderedIds.length === 0) return { data: [], total: 0, page, limit };

      const items = await this.mediaRepo.find({ where: { id: In(orderedIds) } });
      const itemMap = new Map(items.map((m) => [m.id, m]));
      const ordered = orderedIds.map((id) => itemMap.get(id)!).filter(Boolean);
      const tagMap = await this.loadTagsForMedia(ordered.map((m) => m.id));
      return { data: ordered.map((m) => this.toDto(m, tagMap.get(m.id) ?? [])), total, page, limit };
    }

    const order: { createdAt: 'ASC' | 'DESC' } =
      dto.sort === 'oldest' ? { createdAt: 'ASC' } : { createdAt: 'DESC' };

    const [items, total] = await this.mediaRepo.findAndCount({
      where: whereCondition,
      order,
      skip,
      take: limit,
    });

    const tagMap = await this.loadTagsForMedia(items.map((m) => m.id));
    return { data: items.map((m) => this.toDto(m, tagMap.get(m.id) ?? [])), total, page, limit };
  }

  async findOne(id: string): Promise<Media> {
    const media = await this.mediaRepo.findOne({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');

    const tagMap = await this.loadTagsForMedia([id]);
    media.tags = (tagMap.get(id) ?? []) as unknown as Tag[];
    return media;
  }

  async download(id: string, thumbnail: boolean, res: Response): Promise<void> {
    const media = await this.mediaRepo.findOne({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');

    const useThumbnail = thumbnail && !!media.thumbnailKey;
    const key = useThumbnail ? media.thumbnailKey : media.objectKey;
    const mimeType = useThumbnail ? 'image/jpeg' : (media.mimeType ?? 'application/octet-stream');

    const stream = await this.minioService.getObject(key);

    if (useThumbnail) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Content-Disposition', 'inline');
    } else {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(media.fileName)}"`,
      );
    }
    res.setHeader('Content-Type', mimeType);
    stream.pipe(res);
  }

  async bulkDownload(dto: BulkDownloadDto, res: Response): Promise<void> {
    const tagSlugs = dto.tags ?? [];

    let items: Media[];
    if (tagSlugs.length > 0) {
      const ids = await this.filterIdsByTags(tagSlugs);
      items = ids.length > 0 ? await this.mediaRepo.find({ where: { id: In(ids) } }) : [];
    } else {
      items = await this.mediaRepo.find();
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="duskbird-export.zip"');

    const archive = archiver('zip', { zlib: { level: 0 } });
    archive.pipe(res);

    for (const item of items) {
      const stream = await this.minioService.getObject(item.objectKey);
      archive.append(stream, { name: item.fileName });
    }

    await archive.finalize();
  }

  async remove(id: string, user: JwtPayload): Promise<void> {
    const media = await this.mediaRepo.findOne({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');

    if (user.role !== Role.Admin && media.uploaderId !== user.sub) {
      throw new ForbiddenException('You do not own this media');
    }

    await this.minioService.removeObject(media.objectKey);
    if (media.thumbnailKey) {
      await this.minioService.removeObject(media.thumbnailKey).catch(() => undefined);
    }
    await this.mediaRepo.remove(media);
  }

  async addTags(id: string, tagNames: string[], createdById: string, isAdmin = false): Promise<Media> {
    const media = await this.mediaRepo.findOne({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');

    const tags = await Promise.all(
      tagNames.map(async (name) => {
        if (isAdmin) return this.tagsService.findOrCreate(name, createdById);
        const tag = await this.tagsService.findExisting(name);
        if (!tag) throw new BadRequestException(`Tag "${name}" does not exist — request it from an admin`);
        return tag;
      }),
    );

    const existing: { tag_id: string }[] = await this.mediaRepo.query(
      `SELECT tag_id FROM media_tags WHERE media_id = $1`,
      [id],
    );
    const existingIds = new Set(existing.map((r) => r.tag_id));
    const newTags = tags.filter((t) => !existingIds.has(t.id));

    if (newTags.length > 0) {
      const placeholders = newTags.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
      const params = newTags.flatMap((t) => [id, t.id]);
      await this.mediaRepo.query(
        `INSERT INTO media_tags (media_id, tag_id) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
        params,
      );
    }

    return this.findOne(id);
  }

  async removeTag(mediaId: string, tagId: string): Promise<Media> {
    await this.mediaRepo.query(
      `DELETE FROM media_tags WHERE media_id = $1 AND tag_id = $2`,
      [mediaId, tagId],
    );
    return this.findOne(mediaId);
  }
}
