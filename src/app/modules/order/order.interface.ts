
export type DeliveryType = "inside_dhaka" | "outside_dhaka";

export interface CartItemDTO {
  productId: string;
  quantity: number;
  color?: string;
  size?: string;
  sku? : string;
}

export interface DeliveryInfoDTO {
  name: string;
  phone: string;
  state: string;
  address: string;
}

export interface CreateOrderDTO {
  deliveryInfo: DeliveryInfoDTO;
  deliveryType: DeliveryType;
  cartItems: CartItemDTO[];
  paymentMethod: "ONLINE" | "COD";
  checkoutEmail?: string;
}


