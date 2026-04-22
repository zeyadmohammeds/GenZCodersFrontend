export interface MediaDto {
  id: number;
  tableName?: string | null;
  tableId: number;
  filePath?: string | null;
}

export interface MediaCreateRequest {
  tableName?: string | null;
  tableId: number;
  filePath?: string | null;
}
