import { prisma } from '@/lib/db/prisma';
import { extractTextFromPDF, extractTextFromFile, chunkText, cleanText } from '@/lib/utils/text-processing';
import { getStorageProvider } from '@/lib/storage/local';
import { processDocumentEmbeddings } from '@/lib/ai/rag/embeddings';
import { logger } from '@/lib/utils/logger';
import { trackUsage } from '@/lib/subscriptions/features';
import { v4 as uuid } from 'uuid';

export async function uploadDocument(
  file: File,
  companyId: string,
  userId: string,
  title: string,
  description?: string,
  category?: string,
  tags?: string[]
) {
  const storage = getStorageProvider();
  const documentId = uuid();
  const fileName = file.name;
  const fileType = file.type;
  const fileSize = file.size;

  try {
    logger.info(`Uploading document: ${fileName} for company ${companyId}`);

    // Save file to storage
    const fileBuffer = await file.arrayBuffer();
    const filePath = `${companyId}/${documentId}/${fileName}`;
    await storage.save(filePath, Buffer.from(fileBuffer));

    // Create document record
    const document = await prisma.document.create({
      data: {
        id: documentId,
        companyId,
        title,
        description,
        fileName,
        fileSize,
        fileType,
        filePath,
        category,
        tags: tags || [],
        uploadedBy: userId,
        status: 'UPLOADED',
      },
    });

    logger.info(`Document created: ${documentId}`);

    // Extract text based on file type
    let text = '';
    try {
      if (fileType === 'application/pdf') {
        text = await extractTextFromPDF(file);
      } else if (fileType === 'text/plain' || fileType === 'text/markdown') {
        text = await extractTextFromFile(file);
      } else {
        throw new Error('Unsupported file type');
      }
    } catch (error) {
      logger.error('Text extraction error:', error);
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'FAILED',
          processingError: 'Failed to extract text from file',
        },
      });
      throw new Error('Failed to extract text');
    }

    // Process document embeddings (in MVP, synchronous)
    const result = await processDocumentEmbeddings(documentId, companyId, text);

    if (result.error) {
      throw new Error(result.error);
    }

    // Track usage
    await trackUsage(companyId, userId, 'DOCUMENTS_PROCESSED', 1, {
      fileName,
      fileSize,
      chunks: result.chunksCreated,
    });

    return document;
  } catch (error) {
    logger.error('Document upload error:', error);
    throw error;
  }
}

export async function getDocument(documentId: string, companyId: string) {
  return prisma.document.findFirst({
    where: {
      id: documentId,
      companyId,
    },
  });
}

export async function getCompanyDocuments(
  companyId: string,
  status?: string,
  limit: number = 20,
  offset: number = 0
) {
  return prisma.document.findMany({
    where: {
      companyId,
      ...(status && { status }),
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export async function deleteDocument(documentId: string, companyId: string) {
  const document = await prisma.document.findFirst({
    where: { id: documentId, companyId },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  // Soft delete
  await prisma.document.update({
    where: { id: documentId },
    data: { deletedAt: new Date() },
  });

  // Delete associated chunks
  await prisma.documentChunk.deleteMany({
    where: { documentId },
  });
}

export async function archiveDocument(documentId: string, companyId: string) {
  const document = await prisma.document.findFirst({
    where: { id: documentId, companyId },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { status: 'ARCHIVED' },
  });
}
