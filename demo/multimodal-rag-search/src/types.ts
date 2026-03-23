/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FileType = 'image' | 'video' | 'audio' | 'document';

export interface EmbeddedFile {
  id: string;
  name: string;
  type: FileType;
  mimeType: string;
  data: string; // Original Base64 or text content
  extractedText?: string; // Extracted text for Office files
  embedding: number[];
  timestamp: number;
}

export interface SearchResult extends EmbeddedFile {
  score: number;
}
