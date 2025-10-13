declare module 'multer-s3' {
  import { S3Client } from '@aws-sdk/client-s3';

  interface MulterS3Options {
    s3: S3Client;
    bucket: string;
    key?: (req: any, file: Express.Multer.File, cb: any) => void;
    metadata?: (req: any, file: Express.Multer.File, cb: any) => void;
    contentType?: string | ((req: any, file: Express.Multer.File, cb: any) => void);
    acl?: string;
    cacheControl?: string;
    contentDisposition?: string;
    contentEncoding?: string;
    contentLanguage?: string;
    expires?: Date;
    serverSideEncryption?: string;
    storageClass?: string;
    tagging?: string;
  }

  interface MulterS3 {
    (options: MulterS3Options): any;
    AUTO_CONTENT_TYPE: string;
  }

  const multerS3: MulterS3;
  export = multerS3;
}
