import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../common/types/role.enum';
import { MinioService } from '../media/minio.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    private readonly minioService: MinioService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.repo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`User with email ${dto.email} already exists`);
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = this.repo.create({
      email: dto.email,
      displayName: dto.displayName,
      passwordHash,
      role: dto.role ?? Role.User,
    });

    return this.repo.save(user);
  }

  findAll(): Promise<User[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');

    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.password) user.passwordHash = await argon2.hash(dto.password);

    return this.repo.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');

    // Remove MinIO objects before the DB cascade deletes the media records.
    const mediaRows: { object_key: string }[] = await this.repo.query(
      `SELECT object_key FROM media WHERE uploader_id = $1`,
      [id],
    );
    const keys = mediaRows.map((r) => r.object_key).filter(Boolean);
    if (keys.length > 0) {
      await this.minioService.removeObjects(keys).catch(() => undefined);
    }

    await this.repo.remove(user);
  }
}
