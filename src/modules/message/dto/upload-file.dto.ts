export class UploadFileDto {
  conversationId?: string;
  locationId?: string;
}

export interface UploadResponse {
  status: number;
  message: string;
  data: {
    attachmentUrls: string[];
    originalName: string;
    size: number;
    mimetype: string;
  };
}

export interface GHLUploadResponse {
  attachmentUrls: string[];
}
