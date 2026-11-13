import fs from 'fs';
import path from 'path';

const ALLOWED_MIME_BY_EXTENSION: Record<string, string[]> = {
  '.jpeg': ['image/jpeg'],
  '.jpg': ['image/jpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp'],
  '.gif': ['image/gif'],
  '.mp4': ['video/mp4'],
  '.pdf': ['application/pdf'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

function readHeader(filePath: string, length = 1024): Buffer | null {
  let fd: number | undefined;
  try {
    fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(length);
    const bytesRead = fs.readSync(fd, buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead);
  } catch {
    return null;
  } finally {
    if (fd !== undefined) {
      fs.closeSync(fd);
    }
  }
}

function startsWith(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) return false;
  return buffer.subarray(0, signature.length).equals(Buffer.from(signature));
}

function matchesContent(header: Buffer, extension: string): boolean {
  switch (extension) {
    case '.jpeg':
    case '.jpg':
      return startsWith(header, [0xff, 0xd8, 0xff]);
    case '.png':
      return startsWith(header, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case '.gif': {
      const signature = header.subarray(0, 6).toString('ascii');
      return signature === 'GIF87a' || signature === 'GIF89a';
    }
    case '.webp':
      return (
        header.length >= 12 &&
        header.subarray(0, 4).toString('ascii') === 'RIFF' &&
        header.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    case '.pdf':
      // The PDF header may appear after leading whitespace/BOM; the spec
      // only requires it within the first 1024 bytes.
      return header.includes(Buffer.from('%PDF-'));
    case '.mp4':
      return header.length >= 8 && header.subarray(4, 8).toString('ascii') === 'ftyp';
    case '.docx':
      // DOCX is a ZIP container. The MIME type and extension are checked
      // separately; this only rejects obviously unrelated content.
      return startsWith(header, [0x50, 0x4b, 0x03, 0x04]);
    default:
      return false;
  }
}

export default (config: any, { strapi }: { strapi: any }) => {
  return async (ctx: any, next: any) => {
    if (ctx.request.files && Object.keys(ctx.request.files).length > 0) {
      const files = ctx.request.files;

      const validateFile = (file: any) => {
        const name = file.originalFilename || file.name || '';
        const mime = file.mimetype || file.type || '';
        const ext = path.extname(name).toLowerCase();

        const expectedMimeTypes = ALLOWED_MIME_BY_EXTENSION[ext];
        if (!expectedMimeTypes) {
          return `File extension "${ext}" is not allowed.`;
        }
        if (!expectedMimeTypes.includes(mime)) {
          return `MIME type "${mime}" does not match extension "${ext}".`;
        }

        const filePath = file.filepath || file.path;
        if (!filePath) {
          return 'Uploaded file has no temporary path.';
        }

        const header = readHeader(filePath);
        if (!header) {
          return 'Could not read the uploaded file for validation.';
        }
        if (!matchesContent(header, ext)) {
          return `File content does not match extension "${ext}".`;
        }

        return null;
      };

      for (const key in files) {
        let fileOrArray = files[key];
        let fileArray = Array.isArray(fileOrArray) ? fileOrArray : [fileOrArray];
        
        for (const file of fileArray) {
          const errorMsg = validateFile(file);
          if (errorMsg) {
            try {
              for (const k in files) {
                const fa = Array.isArray(files[k]) ? files[k] : [files[k]];
                for (const f of fa) {
                  const p = f.filepath || f.path;
                  if (p && fs.existsSync(p)) {
                    fs.unlinkSync(p);
                  }
                }
              }
            } catch (e) {
              strapi.log.error('Failed to cleanup tmp files in upload-security middleware:', e);
            }

            return ctx.badRequest('File upload error: ' + errorMsg);
          }
        }
      }
    }

    await next();
  };
};
