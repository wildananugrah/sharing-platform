import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export const uploadToS3 = async (file: Buffer, key: string, contentType: string) => {
    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: key,
        Body: file,
        ContentType: contentType,
    });

    await s3Client.send(command);
    return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

export const deleteFromS3 = async (key: string) => {
    const command = new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: key,
    });

    await s3Client.send(command);
};

export const getSignedUrlForVideo = async (key: string) => {
    const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
};