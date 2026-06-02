import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import slugify from 'slugify';
import { Tag } from './entities/tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { MergeTagsDto } from './dto/merge-tags.dto';
import { TagResponseDto } from './dto/tag-response.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
    private readonly dataSource: DataSource,
  ) {}

  private normalize(name: string): string {
    return name.toLowerCase().trim();
  }

  private makeSlug(name: string): string {
    return slugify(name, { lower: true, strict: true });
  }

  // Strips spaces/hyphens so "postmodern" and "post modern" share the same key.
  private comparisonKey(name: string): string {
    return name.replace(/[\s-]+/g, '');
  }

  private async findBySpaceInsensitive(name: string): Promise<Tag | null> {
    const key = this.comparisonKey(name);
    const rows: Tag[] = await this.tagRepo.query(
      `SELECT * FROM tags WHERE REPLACE(REPLACE(slug, '-', ''), '_', '') = $1 LIMIT 1`,
      [key],
    );
    return rows[0] ?? null;
  }

  async create(dto: CreateTagDto, createdById: string): Promise<Tag> {
    const name = this.normalize(dto.name);
    const slug = this.makeSlug(name);

    const existing =
      (await this.tagRepo.findOne({ where: [{ name }, { slug }] })) ??
      (await this.findBySpaceInsensitive(name));
    if (existing) throw new ConflictException('A tag with that name already exists');

    const tag = this.tagRepo.create({ name, slug, createdById });
    return this.tagRepo.save(tag);
  }

  async findOrCreate(name: string, createdById: string): Promise<Tag> {
    const normalized = this.normalize(name);
    const slug = this.makeSlug(normalized);

    // Exact slug match first (fast, indexed).
    const exact = await this.tagRepo.findOne({ where: { slug } });
    if (exact) return exact;

    // Space-insensitive fallback — "postmodern" finds "post-modern".
    const fuzzy = await this.findBySpaceInsensitive(normalized);
    if (fuzzy) return fuzzy;

    const tag = this.tagRepo.create({ name: normalized, slug, createdById });
    return this.tagRepo.save(tag);
  }

  async deleteIfUnused(tagId: string): Promise<void> {
    const rows: { count: string }[] = await this.tagRepo.query(
      `SELECT COUNT(*) FROM media_tags WHERE tag_id = $1`,
      [tagId],
    );
    if (parseInt(rows[0].count, 10) === 0) {
      await this.tagRepo.delete(tagId);
    }
  }

  async findAll(): Promise<TagResponseDto[]> {
    const rows = await this.tagRepo
      .createQueryBuilder('t')
      .loadRelationCountAndMap('t.usageCount', 't.media')
      .orderBy('t.name', 'ASC')
      .getMany();

    return rows.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      usageCount: (t as Tag & { usageCount: number }).usageCount ?? 0,
      createdAt: t.createdAt,
    }));
  }

  async findById(id: string): Promise<Tag> {
    const tag = await this.tagRepo.findOne({ where: { id } });
    if (!tag) throw new NotFoundException('Tag not found');
    return tag;
  }

  async update(id: string, dto: UpdateTagDto): Promise<Tag> {
    const tag = await this.findById(id);
    const name = this.normalize(dto.name);
    const slug = this.makeSlug(name);

    const conflict = await this.tagRepo.findOne({ where: [{ name }, { slug }] });
    if (conflict && conflict.id !== id) {
      throw new ConflictException('A tag with that name already exists');
    }

    tag.name = name;
    tag.slug = slug;
    return this.tagRepo.save(tag);
  }

  async merge(dto: MergeTagsDto): Promise<void> {
    const [source, target] = await Promise.all([
      this.findById(dto.sourceId),
      this.findById(dto.targetId),
    ]);

    await this.dataSource.transaction(async (em) => {
      await em.query(
        `INSERT INTO media_tags (media_id, tag_id)
         SELECT media_id, $1 FROM media_tags WHERE tag_id = $2
         ON CONFLICT DO NOTHING`,
        [target.id, source.id],
      );
      await em.query(`DELETE FROM media_tags WHERE tag_id = $1`, [source.id]);
      await em.remove(source);
    });
  }

  async remove(id: string): Promise<void> {
    const tag = await this.findById(id);
    await this.tagRepo.remove(tag);
  }
}
