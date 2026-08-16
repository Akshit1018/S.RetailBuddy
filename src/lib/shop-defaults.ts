import type { ShopCard, WaTemplate } from "@/lib/types";

export function defaultShop(): ShopCard {
  return {
    name: "Sharma Kirana",
    tagline: "Daily needs · fresh stock",
    address: "12, MI Road",
    city: "Jaipur",
    hours: "8:00 AM – 9:30 PM",
    phone: "9876543210",
    whatsapp: "9876543210",
    mapsUrl: "",
    gstin: "08AABCS8821P1Z3",
    about: "Neighbourhood kirana. Scan, pick items, send order on WhatsApp.",
    logoDataUrl: null,
    coverHue: 228,
    showPrices: true,
    showOutOfStock: false,
  };
}

export function defaultTemplates(): WaTemplate[] {
  return [
    {
      id: "tpl_due",
      name: "Payment reminder",
      body: "Namaste {name}, {shop} se yaad. Aapka bill {amount} pending hai. UPI se pay kar dena. Dhanyavaad.",
    },
    {
      id: "tpl_offer",
      name: "Festival offer",
      body: "Namaste {name}! {shop} par aaj special rate. Catalogue: {link} Order WhatsApp pe bhej do.",
    },
    {
      id: "tpl_ready",
      name: "Order ready",
      body: "Namaste {name}, aapka order {shop} par ready hai. Pickup kar lijiye.",
    },
    {
      id: "tpl_thanks",
      name: "Thank you",
      body: "Dhanyavaad {name}! {shop} par aana hua. Next order: {link}",
    },
  ];
}
