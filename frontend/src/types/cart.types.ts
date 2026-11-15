// Panier estimatif. Le snapshot de prix mémorise le prix au moment de l'ajout ;
// le total est recalculé avec le prix courant du produit.

export interface CartItem {
  id: string;
  productId: string;
  companyId: string;
  quantity: number;
  unitPriceSnapshot: number;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
}
