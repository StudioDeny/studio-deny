// The "Worn By Our Community" bento grid on the homepage has a FIXED shape
// per position — a photo's spot in the list determines whether it renders
// as the hero, a tall card, a wide banner, or a standard square. It is NOT
// driven by community_photos.bento_size (that field is legacy — nothing
// reads it for layout anymore). Both the live component and the admin CMS
// import this same array so they can never silently drift apart again like
// they did before this file existed.
export type BentoSlot = { shape: "Hero" | "Tall" | "Wide" | "Standard"; className: string };

export const BENTO_SLOTS: BentoSlot[] = [
  { shape: "Hero", className: "col-span-1 sm:col-span-2 row-span-2" },
  { shape: "Tall", className: "col-span-1 row-span-2" },
  { shape: "Standard", className: "col-span-1 row-span-1" },
  { shape: "Standard", className: "col-span-1 row-span-1" },
  { shape: "Wide", className: "col-span-1 sm:col-span-2 row-span-1" },
  { shape: "Standard", className: "col-span-1 row-span-1" },
  { shape: "Standard", className: "col-span-1 row-span-1" },
];

export const BENTO_SLOT_COUNT = BENTO_SLOTS.length;
