export const MAX_UPLOAD_FILES = Number(process.env.MAX_UPLOAD_FILES || 50);
export const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 15);
export const MAX_FILE_SIZE_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
