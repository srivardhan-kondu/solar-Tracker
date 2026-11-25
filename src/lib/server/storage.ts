import 'server-only';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

export const BUCKET = process.env.S3_BUCKET || 'images';

export const s3 = new S3Client({
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  region: process.env.AWS_REGION || 'us-east-2',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Folders the app may store photos in */
export const FOLDERS = ['surveys', 'installations'] as const;

/** Safe piece of a storage path: letters, digits and dashes only */
const clean = (s: string) => s.replace(/[^A-Za-z0-9-]/g, '').slice(0, 64) || 'misc';

/** Store a photo and return its storage key */
export const putPhoto = async (folder: string, group: string, contentType: string, bytes: Buffer) => {
  const ext = TYPES[contentType];
  if (!ext) throw new Error('unsupported type');
  const key = `${clean(folder)}/${clean(group)}/${randomUUID()}.${ext}`;
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: bytes, ContentType: contentType }));
  return key;
};

/** The stored photo itself, to check it has not changed */
export const getPhotoBytes = async (key: string) => {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!res.Body) throw new Error('empty');
  return Buffer.from(await res.Body.transformToByteArray());
};

/** A link to view a stored photo, valid for one hour */
export const photoLink = (key: string) =>
  getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 3600 });

/** Only keys this app could have made: folder/group/uuid.ext */
export const isValidKey = (key: string) =>
  /^[A-Za-z0-9-]{1,64}\/[A-Za-z0-9-]{1,64}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(key) &&
  (FOLDERS as readonly string[]).includes(key.split('/')[0]);
