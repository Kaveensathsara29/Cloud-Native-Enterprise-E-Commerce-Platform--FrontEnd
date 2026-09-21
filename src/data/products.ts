export interface Review {
  id: string;
  userName: string;
  rating: number;
  date: string;
  comment: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  longDescription: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  category: string;
  images: string[];
  colors: { name: string; hex: string }[];
  sizes?: string[];
  specs: { [key: string]: string };
  reviews: Review[];
  featured?: boolean;
  onSale?: boolean;
  inStock: boolean;
  freeShipping?: boolean;
  shippingFee?: number;
}

export const MOCK_PRODUCTS: Product[] = [];
