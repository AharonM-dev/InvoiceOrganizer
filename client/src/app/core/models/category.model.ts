export interface Category {
  id: number;
  name: string;
  isGlobal: boolean;
}

export interface CreateCategoryDto {
  name: string;
}
