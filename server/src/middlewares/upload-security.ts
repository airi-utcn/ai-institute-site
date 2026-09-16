import fs from 'fs';
import path from 'path';

export default (config: any, { strapi }: { strapi: any }) => {
  return async (ctx: any, next: any) => {
    if (ctx.request.files && Object.keys(ctx.request.files).length > 0) {
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      const allowedExtensions = [
        '.jpeg', '.jpg', '.png', '.webp', '.gif', '.mp4', '.pdf', '.docx'
      ];
      
      const files = ctx.request.files;
      
      const validateFile = (file: any) => {
        const name = file.originalFilename || file.name || '';
        const mime = file.mimetype || file.type || '';
        const ext = path.extname(name).toLowerCase();
        
        if (!allowedMimeTypes.includes(mime)) {
          return `MIME type "${mime}" is not allowed.`;
        }
        if (!allowedExtensions.includes(ext)) {
          return `File extension "${ext}" is not allowed.`;
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
