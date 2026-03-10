import {
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
    HttpStatus,
    HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { FileService } from './file.service';

@Controller('files')
export class FileController {
    constructor(private readonly fileService: FileService) { }

    @Post('upload')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './uploads',
                filename: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
                },
            }),
        }),
    )
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new HttpException('File not found', HttpStatus.BAD_REQUEST);
        }

        const hash = await this.fileService.getFileHash(file.path);

        return {
            filename: file.filename,
            originalname: file.originalname,
            path: `/uploads/${file.filename}`,
            size: file.size,
            mime: file.mimetype,
            hash: `0x${hash}`,
        };
    }
}
