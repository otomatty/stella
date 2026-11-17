export type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
};

export function updatePrice(product: Product, price: number): Product {
  return { ...product, price };
}

export function restock(product: Product, amount: number): Product {
  return { ...product, stock: product.stock + amount };
}

export function summary(product: Product): string {
  const { name, price, stock } = product;
  return `${name}: ${price}円（在庫 ${stock}）`;
}
