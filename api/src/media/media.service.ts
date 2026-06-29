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
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { extname, join } from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as archiver from 'archiver';

const execFileAsync = promisify(execFile);
import { Request, Response } from 'express';
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
      const thumbBuffer = await sharp(buffer, { pages: 1 })
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

  private async generateVideoThumbnail(
    buffer: Buffer,
    mimeType: string,
    uploaderId: string,
  ): Promise<string | null> {
    const ext = mimeType.split('/')[1] ?? 'mp4';
    const inputPath = join(tmpdir(), `${uuidv4()}.${ext}`);
    const outputPath = join(tmpdir(), `${uuidv4()}_thumb.jpg`);
    try {
      await writeFile(inputPath, buffer);
      await execFileAsync('ffmpeg', [
        '-ss', '1',
        '-i', inputPath,
        '-frames:v', '1',
        '-vf', 'scale=800:800:force_original_aspect_ratio=decrease',
        '-y', outputPath,
      ]);
      const thumbBuffer = await readFile(outputPath);
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
      this.logger.warn(`Video thumbnail generation failed: ${(err as Error).message}`);
      return null;
    } finally {
      await Promise.all([
        unlink(inputPath).catch(() => undefined),
        unlink(outputPath).catch(() => undefined),
      ]);
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
      : mimeType.startsWith('video/')
        ? await this.generateVideoThumbnail(file.buffer, mimeType, uploaderId)
        : null;

    let media: Media;
    try {
      const entity = this.mediaRepo.create({
        uploaderId,
        objectKey,
        thumbnailKey: thumbnailKey ?? undefined,
        fileName: file.originalname,
        mimeType,
        sizeBytes: file.size,
        contentHash,
      });
      media = await this.mediaRepo.save(entity);
    } catch (err) {
      await this.minioService.removeObject(objectKey).catch(() => undefined);
      if (thumbnailKey) {
        await this.minioService.removeObject(thumbnailKey).catch(() => undefined);
      }
      throw err;
    }

    const autoTagNames = this.getAutoTagNames(mimeType, file.buffer);
    if (autoTagNames.length > 0) {
      try {
        const tags = await Promise.all(
          autoTagNames.map((name) => this.tagsService.findOrCreate(name, uploaderId)),
        );
        const placeholders = tags.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
        const params = tags.flatMap((t) => [media.id, t.id]);
        await this.mediaRepo.query(
          `INSERT INTO media_tags (media_id, tag_id) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
          params,
        );
      } catch (err) {
        this.logger.warn(`Auto-tagging failed for ${media.id}: ${(err as Error).message}`);
      }
    }

    return media;
  }

  private getAutoTagNames(mimeType: string, buffer: Buffer): string[] {
    if (mimeType.startsWith('video/')) return ['video'];
    if (mimeType === 'image/gif') return ['animated'];
    if (mimeType === 'image/webp' && this.isAnimatedWebP(buffer)) return ['animated'];
    return [];
  }

  private isAnimatedWebP(buffer: Buffer): boolean {
    // Animated WebP files contain an 'ANIM' chunk in the RIFF container
    return buffer.length > 12 && buffer.indexOf(Buffer.from('ANIM')) !== -1;
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
      const orderExpr = dto.seed
        ? `md5(id::text || $${p + 1}::text)`
        : 'RANDOM()';
      const orderParams = dto.seed ? [dto.seed] : [];
      const rows: { id: string }[] = await this.mediaRepo.query(
        `SELECT id FROM media ${whereClause} ORDER BY ${orderExpr} LIMIT $${p + orderParams.length + 1} OFFSET $${p + orderParams.length + 2}`,
        [...baseParams, ...orderParams, limit, skip],
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

  private buildDownloadEtag(media: Media, useThumbnail: boolean): string {
    const keyPart = useThumbnail ? (media.thumbnailKey ?? media.objectKey) : media.objectKey;
    const updatedAt = media.updatedAt?.toISOString() ?? '';
    const sizePart = String(media.sizeBytes ?? 0);
    const hash = createHash('sha1')
      .update(`${media.id}:${keyPart}:${updatedAt}:${sizePart}:${useThumbnail ? 'thumb' : 'original'}`)
      .digest('hex');
    return `"${hash}"`;
  }

  private isNotModified(req: Request, etag: string, updatedAt?: Date): boolean {
    const ifNoneMatch = req.headers['if-none-match'];
    const hasMatchingEtag = (value: string): boolean => {
      const candidates = value.split(',').map((v) => v.trim());
      return candidates.includes('*') || candidates.includes(etag);
    };

    if (typeof ifNoneMatch === 'string' && hasMatchingEtag(ifNoneMatch)) {
      return true;
    }

    if (Array.isArray(ifNoneMatch) && ifNoneMatch.some((v) => hasMatchingEtag(v))) {
      return true;
    }

    const ifModifiedSince = req.headers['if-modified-since'];
    if (typeof ifModifiedSince === 'string' && updatedAt) {
      const since = Date.parse(ifModifiedSince);
      if (!Number.isNaN(since) && updatedAt.getTime() <= since) {
        return true;
      }
    }

    return false;
  }

  async download(id: string, thumbnail: boolean, req: Request, res: Response): Promise<void> {
    const media = await this.mediaRepo.findOne({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');

    const useThumbnail = thumbnail && !!media.thumbnailKey;
    const key = useThumbnail ? media.thumbnailKey : media.objectKey;
    const mimeType = useThumbnail ? 'image/jpeg' : (media.mimeType ?? 'application/octet-stream');
    const etag = this.buildDownloadEtag(media, useThumbnail);

    if (useThumbnail) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable, stale-while-revalidate=86400');
      res.setHeader('Content-Disposition', 'inline');
    } else {
      res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(media.fileName)}"`,
      );
    }

    res.setHeader('ETag', etag);
    res.setHeader('Last-Modified', media.updatedAt.toUTCString());
    res.setHeader('Vary', 'Accept-Encoding');

    if (this.isNotModified(req, etag, media.updatedAt)) {
      res.status(304).end();
      return;
    }

    const stream = await this.minioService.getObject(key);

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
