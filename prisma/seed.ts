import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcrypt";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { OrderStatus } from "../src/generated/prisma/enums";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const SEED_DIR = path.resolve(import.meta.dirname, "../uploads/seed");

type Kind = "bat" | "ball" | "helmet" | "gloves" | "pads" | "shirt" | "cap" | "bag" | "shoe";

// ---------- Simple product illustrations (SVG) so the shop has images out of the box ----------
function illustration(kind: Kind, bg: [string, string], accent: string): string {
  const shapes: Record<Kind, string> = {
    bat: `<g transform="rotate(-35 300 300)">
        <rect x="285" y="70" width="30" height="150" rx="12" fill="#1f2937"/>
        <rect x="283" y="80" width="34" height="120" rx="12" fill="${accent}" opacity=".9"/>
        <path d="M250 215 h100 v270 q0 40 -50 40 q-50 0 -50 -40z" fill="#f3dfb0" stroke="#b8925a" stroke-width="6"/>
        <rect x="268" y="300" width="64" height="90" rx="8" fill="${accent}"/>
        <text x="300" y="355" text-anchor="middle" font-family="Arial" font-weight="700" font-size="22" fill="#fff">BWS</text></g>`,
    ball: `<circle cx="300" cy="300" r="150" fill="${accent}"/>
        <circle cx="300" cy="300" r="150" fill="url(#shine)"/>
        <path d="M200 190 q100 110 0 220 M400 190 q-100 110 0 220" stroke="#fde68a" stroke-width="8" fill="none" stroke-dasharray="14 10"/>`,
    helmet: `<path d="M150 330 q0 -190 150 -190 q150 0 150 190 z" fill="${accent}"/>
        <rect x="140" y="320" width="320" height="26" rx="10" fill="#111827"/>
        <g stroke="#cbd5e1" stroke-width="10" fill="none"><path d="M175 350 q125 120 250 0"/><path d="M190 390 h220"/><line x1="300" y1="346" x2="300" y2="440"/></g>`,
    gloves: `<path d="M210 460 v-170 q0 -30 25 -30 v-90 q0 -22 22 -22 q22 0 22 22 v80 v-110 q0 -22 22 -22 q22 0 22 22 v110 v-95 q0 -22 22 -22 q22 0 22 22 v100 v-70 q0 -22 22 -22 q22 0 22 22 v190 q0 60 -60 75 h-110 z" fill="#f8fafc" stroke="${accent}" stroke-width="10"/>
        <rect x="205" y="440" width="190" height="40" rx="10" fill="${accent}"/>`,
    pads: `<rect x="215" y="110" width="170" height="380" rx="70" fill="#f8fafc" stroke="${accent}" stroke-width="10"/>
        <g stroke="${accent}" stroke-width="8"><line x1="260" y1="150" x2="260" y2="450"/><line x1="300" y1="140" x2="300" y2="460"/><line x1="340" y1="150" x2="340" y2="450"/></g>
        <rect x="190" y="200" width="220" height="26" rx="8" fill="#111827"/><rect x="190" y="360" width="220" height="26" rx="8" fill="#111827"/>`,
    shirt: `<path d="M220 130 l-110 60 l40 90 l50 -25 v225 h200 v-225 l50 25 l40 -90 l-110 -60 q-30 40 -80 40 q-50 0 -80 -40z" fill="${accent}"/>
        <path d="M260 130 q40 40 80 0" stroke="#fff" stroke-width="10" fill="none"/>
        <text x="300" y="350" text-anchor="middle" font-family="Arial" font-weight="800" font-size="64" fill="#fff" opacity=".9">7</text>`,
    cap: `<path d="M160 340 q0 -170 140 -170 q140 0 140 170 z" fill="${accent}"/>
        <path d="M140 340 h330 q20 0 10 20 q-60 50 -190 30 q-110 -15 -150 -50z" fill="#111827" opacity=".85"/>
        <circle cx="300" cy="172" r="12" fill="#111827"/>`,
    bag: `<rect x="150" y="210" width="300" height="230" rx="30" fill="${accent}"/>
        <path d="M240 210 v-40 q0 -30 30 -30 h60 q30 0 30 30 v40" stroke="#111827" stroke-width="16" fill="none"/>
        <rect x="150" y="290" width="300" height="20" fill="#111827" opacity=".35"/>
        <rect x="270" y="280" width="60" height="40" rx="6" fill="#fde68a"/>`,
    shoe: `<path d="M120 400 q10 -100 70 -120 l70 -40 q40 60 120 70 q100 10 110 70 v30 z" fill="#f8fafc" stroke="${accent}" stroke-width="10"/>
        <rect x="115" y="400" width="380" height="34" rx="12" fill="${accent}"/>
        <g fill="#111827">${Array.from({ length: 8 }, (_, i) => `<circle cx="${150 + i * 45}" cy="446" r="7"/>`).join("")}</g>`,
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient>
    <radialGradient id="shine" cx=".35" cy=".3" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="600" height="600" fill="url(#bg)"/>
  <circle cx="300" cy="300" r="230" fill="#fff" opacity=".18"/>
  ${shapes[kind]}
</svg>`;
}

const palettes: [string, string][] = [
  ["#ecfdf5", "#bbf7d0"],
  ["#fef3c7", "#fde68a"],
  ["#e0f2fe", "#bae6fd"],
  ["#fce7f3", "#fbcfe8"],
  ["#ede9fe", "#ddd6fe"],
  ["#f1f5f9", "#cbd5e1"],
];

interface SeedProduct {
  name: string;
  category: string;
  kind: Kind;
  accent: string;
  price: number;
  stock: number;
  description: string;
  size?: string;
  weight?: string;
  willow?: string;
  featured?: boolean;
}

const products: SeedProduct[] = [
  // Bats
  { name: "Pro Edition English Willow Bat", category: "Bats", kind: "bat", accent: "#14532d", price: 45000, stock: 12, featured: true, size: "Short handle", weight: "about 1.2 kg", willow: "Grade 1 English willow", description: "Hand-picked Grade 1 English willow with straight grains and a big sweet spot. Made for club and professional batters who want power and balance." },
  { name: "Classic Kashmir Willow Bat", category: "Bats", kind: "bat", accent: "#b45309", price: 9500, stock: 30, size: "Short handle", weight: "about 1.15 kg", willow: "Kashmir willow", description: "A strong, reliable Kashmir willow bat for leather-ball practice and weekend matches. Great value for school and club players." },
  { name: "Junior Practice Bat (Size 5)", category: "Bats", kind: "bat", accent: "#1d4ed8", price: 5200, stock: 25, size: "Size 5 (junior)", weight: "about 0.95 kg", willow: "Kashmir willow", description: "Lightweight bat sized for young players aged 10 to 12. Easy to pick up so kids can learn proper technique." },
  { name: "Tape Ball Power Bat", category: "Bats", kind: "bat", accent: "#dc2626", price: 3800, stock: 40, featured: true, size: "Full size", weight: "about 1.0 kg", willow: "Poplar wood", description: "Built for tape-ball street cricket. Thick edges and a light pick-up for big hits." },
  { name: "Players Grade 2 English Willow Bat", category: "Bats", kind: "bat", accent: "#7c3aed", price: 32000, stock: 4, size: "Long handle", weight: "about 1.18 kg", willow: "Grade 2 English willow", description: "Excellent English willow at a mid-range price. Long handle for taller batters." },

  // Balls
  { name: "Test Match Leather Ball (Red)", category: "Balls", kind: "ball", accent: "#b91c1c", price: 3500, stock: 60, featured: true, weight: "156 g", description: "Hand-stitched four-piece leather ball for long-format matches. Holds its shine and shape for many overs." },
  { name: "White Leather Ball (One Day)", category: "Balls", kind: "ball", accent: "#e5e7eb", price: 3800, stock: 45, weight: "156 g", description: "Four-piece white leather ball for limited-overs and floodlit matches." },
  { name: "Pink Day-Night Ball", category: "Balls", kind: "ball", accent: "#db2777", price: 4200, stock: 3, weight: "156 g", description: "Pink leather ball with high visibility under lights for day-night matches." },
  { name: "Tape Ball Pack (6 balls)", category: "Balls", kind: "ball", accent: "#16a34a", price: 1200, stock: 80, description: "Six tennis balls ready for taping. The street cricket favourite." },

  // Protection
  { name: "Titanium Grill Batting Helmet", category: "Protection", kind: "helmet", accent: "#1e3a8a", price: 12500, stock: 15, featured: true, size: "Medium (56-58 cm)", description: "Lightweight shell with a titanium grill and neck guard. Comfortable padding and good airflow." },
  { name: "Pro Batting Gloves", category: "Protection", kind: "gloves", accent: "#15803d", price: 6500, stock: 22, size: "Men's (right-handed)", description: "Pre-curved fingers, split side bar and soft leather palms for great grip and protection." },
  { name: "Lightweight Batting Pads", category: "Protection", kind: "pads", accent: "#0f766e", price: 7800, stock: 18, size: "Men's", weight: "about 1.4 kg (pair)", description: "Light, strong pads with three straps and full knee protection. Easy to run in." },
  { name: "Wicket Keeping Gloves", category: "Protection", kind: "gloves", accent: "#c2410c", price: 5900, stock: 2, size: "Men's", description: "Soft webbing and rubber palms for clean catches behind the stumps." },

  // Clothing
  { name: "Team Green Playing Shirt", category: "Clothing", kind: "shirt", accent: "#15803d", price: 2800, stock: 50, featured: true, size: "S, M, L, XL", description: "Breathable, quick-dry fabric that keeps you cool in long matches. Printable for teams." },
  { name: "Classic Whites Test Shirt", category: "Clothing", kind: "shirt", accent: "#94a3b8", price: 3200, stock: 35, size: "S, M, L, XL", description: "Traditional cream-white cricket shirt for long-format matches." },
  { name: "Sun Protection Cricket Cap", category: "Clothing", kind: "cap", accent: "#166534", price: 1500, stock: 70, size: "Adjustable", description: "Cotton cap with a long peak to keep the sun out of your eyes in the field." },
  { name: "Spiked Cricket Shoes", category: "Clothing", kind: "shoe", accent: "#1d4ed8", price: 11500, stock: 14, size: "UK 7 - 11", description: "Metal spikes for grip on grass, with cushioned soles for fast bowlers and batters." },

  // Bags
  { name: "Wheelie Kit Bag", category: "Bags", kind: "bag", accent: "#14532d", price: 9800, stock: 10, featured: true, size: "Large (90 cm)", description: "Large kit bag with wheels and separate compartments for bats, pads and shoes." },
  { name: "Duffle Cricket Bag", category: "Bags", kind: "bag", accent: "#7f1d1d", price: 5500, stock: 20, size: "Medium", description: "A strong duffle bag that holds a full kit. Shoulder strap and side bat pocket." },
  { name: "Single Bat Cover", category: "Bags", kind: "bag", accent: "#334155", price: 1400, stock: 0, size: "Full size", description: "Padded cover that keeps your bat safe from scratches and moisture." },
];

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  console.log("Seeding BWS Sports database...");

  // Categories
  const categoryNames = ["Bats", "Balls", "Protection", "Clothing", "Bags"];
  const categories = new Map<string, number>();
  for (const name of categoryNames) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    categories.set(name, c.id);
  }

  // Users
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@bwssports.com").toLowerCase();
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      name: "BWS Admin",
      email: adminEmail,
      phone: "+92 300 0000000",
      password: await bcrypt.hash(process.env.ADMIN_PASSWORD ?? "Admin@123", 10),
      address: "BWS Sports, Main Boulevard, Lahore",
      role: "ADMIN",
    },
  });
  const customer = await prisma.user.upsert({
    where: { email: "customer@bwssports.com" },
    update: {},
    create: {
      name: "Ali Khan",
      email: "customer@bwssports.com",
      phone: "+92 321 1234567",
      password: await bcrypt.hash("Customer@123", 10),
      address: "House 12, Street 4, Gulberg, Lahore",
    },
  });

  // Products (only on an empty table so admin changes are never overwritten)
  if ((await prisma.product.count()) === 0) {
    fs.mkdirSync(SEED_DIR, { recursive: true });
    for (const [i, p] of products.entries()) {
      const file = `${slug(p.name)}.svg`;
      fs.writeFileSync(path.join(SEED_DIR, file), illustration(p.kind, palettes[i % palettes.length], p.accent));
      await prisma.product.create({
        data: {
          name: p.name,
          description: p.description,
          price: p.price,
          stock: p.stock,
          size: p.size,
          weight: p.weight,
          willow: p.willow,
          featured: p.featured ?? false,
          image: `/uploads/seed/${file}`,
          categoryId: categories.get(p.category)!,
        },
      });
    }
    console.log(`Created ${products.length} products`);
  } else {
    console.log("Products already exist, skipping");
  }

  // Sample orders and messages so the dashboard has data to show
  if ((await prisma.order.count()) === 0) {
    const all = await prisma.product.findMany({ orderBy: { id: "asc" } });
    const samples: { daysAgo: number; status: OrderStatus; picks: [number, number][] }[] = [
      { daysAgo: 6, status: "DELIVERED", picks: [[0, 1], [5, 2]] },
      { daysAgo: 4, status: "DELIVERED", picks: [[13, 2], [15, 1]] },
      { daysAgo: 3, status: "SHIPPED", picks: [[9, 1]] },
      { daysAgo: 1, status: "PROCESSING", picks: [[1, 1], [10, 1], [11, 1]] },
      { daysAgo: 0, status: "PENDING", picks: [[17, 1], [8, 2]] },
    ];
    for (const s of samples) {
      const items = s.picks.filter(([idx]) => all[idx]).map(([idx, quantity]) => ({ product: all[idx], quantity }));
      const total = items.reduce((sum, it) => sum + it.product.price.toNumber() * it.quantity, 0);
      const date = new Date();
      date.setDate(date.getDate() - s.daysAgo);
      await prisma.order.create({
        data: {
          userId: customer.id,
          total,
          status: s.status,
          phone: customer.phone,
          address: customer.address ?? "Lahore",
          orderDate: date,
          items: { create: items.map((it) => ({ productId: it.product.id, quantity: it.quantity, price: it.product.price })) },
        },
      });
    }
    console.log(`Created ${samples.length} sample orders`);
  }

  if ((await prisma.message.count()) === 0) {
    await prisma.message.createMany({
      data: [
        { name: "Usman Tariq", email: "usman@example.com", message: "Do you have Grade 1 English willow bats with a long handle in stock?" },
        { name: "Sara Ahmed", email: "sara@example.com", message: "I want to order 15 team shirts with names printed. Can you give a team discount?", isRead: true },
      ],
    });
    console.log("Created sample messages");
  }

  console.log("\nDone. Logins:");
  console.log(`  Admin:    ${adminEmail} / ${process.env.ADMIN_PASSWORD ?? "Admin@123"}`);
  console.log("  Customer: customer@bwssports.com / Customer@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
