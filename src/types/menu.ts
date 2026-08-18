/** Plain, serialisable menu shapes shared between server and client. */

export type MenuVariant = {
  id: string;
  label: string;
  /** Centavos. */
  price: number;
  isDefault: boolean;
};

export type MenuProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  /** Centavos. */
  basePrice: number;
  imageUrl: string | null;
  isAvailable: boolean;
  sortOrder: number;
  variants: MenuVariant[];
};

export type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  products: MenuProduct[];
};
