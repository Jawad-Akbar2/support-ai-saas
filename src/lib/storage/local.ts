import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/lib/utils/logger';

export interface StorageProvider {
  save(filePath: string, content: Buffer): Promise<string>;
  read(filePath: string): Promise<Buffer>;
  delete(filePath: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;
}

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath: string = process.env.LOCAL_UPLOAD_DIR || './uploads') {
    this.basePath = basePath;
  }

  async save(filePath: string, content: Buffer): Promise<string> {
    try {
      const fullPath = path.join(this.basePath, filePath);
      const dir = path.dirname(fullPath);

      // Create directories if they don't exist
      await fs.mkdir(dir, { recursive: true });

      // Save file
      await fs.writeFile(fullPath, content);

      logger.info(`File saved to ${fullPath}`);
      return fullPath;
    } catch (error) {
      logger.error('Error saving file:', error);
      throw new Error('Failed to save file');
    }
  }

  async read(filePath: string): Promise<Buffer> {
    try {
      const fullPath = path.join(this.basePath, filePath);
      return await fs.readFile(fullPath);
    } catch (error) {
      logger.error('Error reading file:', error);
      throw new Error('Failed to read file');
    }
  }

  async delete(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.basePath, filePath);
      await fs.unlink(fullPath);
      logger.info(`File deleted: ${fullPath}`);
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

export function getStorageProvider(): StorageProvider {
  const provider = process.env.UPLOAD_PROVIDER || 'local';

  if (provider === 'local') {
    return new LocalStorageProvider();
  }

  // Default to local for MVP
  return new LocalStorageProvider();
}
