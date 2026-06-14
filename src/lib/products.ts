import hoodieBlack from "@/assets/p-hoodie-black.jpg";
import teeLime from "@/assets/p-tee-lime.jpg";
import cargo from "@/assets/p-cargo.jpg";
import bomber from "@/assets/p-bomber.jpg";
import cap from "@/assets/p-cap.jpg";
import teeWhite from "@/assets/p-tee-white.jpg";
import denim from "@/assets/p-denim.jpg";

export type Product = {
  slug: string;
  name: string;
  category: string;
  brand?: string;
  price: number;
  compareAt?: number;
  image: string;
  hoverImage: string;
  badge?: "NEW DROP" | "LAST PIECE" | "SALE" | "SOLD OUT";
  sizes: string[];
  colors: { name: string; hex: string }[];
  description: string;
  material: string;
  stock: number;
};

export const products: Product[] = [
  {
    slug: "shadow-realm-hoodie",
    name: "Shadow Realm Hoodie",
    category: "Tops",
    price: 2499,
    compareAt: 3299,
    image: hoodieBlack,
    hoverImage: bomber,
    badge: "NEW DROP",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [{ name: "Black", hex: "#0a0a0a" }, { name: "Charcoal", hex: "#2a2a2a" }],
    description: "Heavy-weight oversized hoodie. Drop-shoulder cut, brushed fleece interior. Built for the grime.",
    material: "450 GSM cotton fleece. Garment-dyed.",
    stock: 12,
  },
  {
    slug: "toxic-bloom-tee",
    name: "Toxic Bloom Tee",
    category: "Tops",
    price: 1299,
    image: teeLime,
    hoverImage: teeWhite,
    badge: "LAST PIECE",
    sizes: ["S", "M", "L", "XL"],
    colors: [{ name: "Acid", hex: "#C8FF00" }],
    description: "Acid-wash oversized tee with hand-pulled distress print.",
    material: "240 GSM combed cotton.",
    stock: 2,
  },
  {
    slug: "tactical-cargo-pant",
    name: "Tactical Cargo Pant",
    category: "Bottoms",
    price: 2899,
    image: cargo,
    hoverImage: denim,
    sizes: ["S", "M", "L", "XL"],
    colors: [{ name: "Black", hex: "#0a0a0a" }],
    description: "Eight-pocket cargo with bungee hem and reinforced knees.",
    material: "Ripstop nylon-cotton blend.",
    stock: 18,
  },
  {
    slug: "afterhours-bomber",
    name: "Afterhours Bomber",
    category: "Outerwear",
    price: 5499,
    compareAt: 6999,
    image: bomber,
    hoverImage: hoodieBlack,
    badge: "SALE",
    sizes: ["M", "L", "XL"],
    colors: [{ name: "Obsidian", hex: "#0a0a0a" }],
    description: "Vegan-leather bomber with quilted satin lining.",
    material: "PU vegan leather. Recycled satin lining.",
    stock: 6,
  },
  {
    slug: "static-trucker-cap",
    name: "Static Trucker Cap",
    category: "Accessories",
    price: 899,
    image: cap,
    hoverImage: teeWhite,
    sizes: ["One Size"],
    colors: [{ name: "Black/Red", hex: "#FF3B00" }],
    description: "Six-panel trucker with raised embroidery.",
    material: "Cotton twill front, mesh back.",
    stock: 30,
  },
  {
    slug: "ringer-graphic-tee",
    name: "Ringer Graphic Tee",
    category: "Tops",
    price: 1499,
    image: teeWhite,
    hoverImage: teeLime,
    badge: "NEW DROP",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [{ name: "Bone", hex: "#f0e9dc" }],
    description: "Boxy fit with hand-drip graphic.",
    material: "260 GSM heavyweight cotton.",
    stock: 22,
  },
  {
    slug: "grit-denim-baggy",
    name: "Grit Denim Baggy",
    category: "Bottoms",
    price: 3299,
    image: denim,
    hoverImage: cargo,
    sizes: ["28", "30", "32", "34", "36"],
    colors: [{ name: "Indigo", hex: "#243b55" }],
    description: "Rigid 14oz denim. Distressed by hand. Baggy through the leg.",
    material: "100% cotton denim, 14oz.",
    stock: 9,
  },
  {
    slug: "void-hoodie-charcoal",
    name: "Void Hoodie",
    category: "Outerwear",
    price: 2799,
    image: hoodieBlack,
    hoverImage: cargo,
    sizes: ["S", "M", "L", "XL"],
    colors: [{ name: "Void", hex: "#0a0a0a" }],
    description: "Minimalist heavyweight pullover. No print, all weight.",
    material: "500 GSM loopback cotton.",
    stock: 14,
  },
];

export const categories = ["All", "Tops", "Bottoms", "Outerwear", "Accessories"] as const;
export type Category = (typeof categories)[number];

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
