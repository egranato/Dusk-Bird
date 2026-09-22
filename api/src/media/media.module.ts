import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from './entities/media.entity';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MinioService } from './minio.service';
import { TagsModule } from '../tags/tags.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Media]),
    TagsModule,
  ],
  controllers: [MediaController],
  providers: [MediaService, MinioService],
})
export class MediaModule {}
