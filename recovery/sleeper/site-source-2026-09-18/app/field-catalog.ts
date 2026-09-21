import type { Metadata } from "next";

export type FieldId =
  | "return"
  | "garden"
  | "body"
  | "maps"
  | "rules"
  | "bridge"
  | "cultivators"
  | "vertical"
  | "confluence"
  | "ridge";

export type FieldDefinition = {
  id: FieldId;
  number: string;
  href: string;
  title: string;
  subtitle: string;
  operator: string;
  law: string;
  image: string;
  description: string;
  light: boolean;
};

export const FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    id: "return", number: "01", href: "/one-return", title: "ONE RETURN", subtitle: "A WALKABLE GLYPH CITY",
    operator: "RETURN", law: "RESTORE WITH DIFFERENCE", image: "/confluence.png", light: false,
    description: "A phrase, verse cell, and figure compile an ASCII city; enacted Gate proofs become a portable return.",
  },
  {
    id: "garden", number: "02", href: "/garden", title: "LISTENING GARDEN", subtitle: "A PLAYABLE WORD-SCORE",
    operator: "LISTEN", law: "PRECISION WITHOUT DISSOLUTION", image: "/botanage.png", light: true,
    description: "Words become timed organisms; performance residue becomes an instrument.",
  },
  {
    id: "body", number: "03", href: "/body-city", title: "BODY CITY", subtitle: "THE BREATH LEDGER",
    operator: "ANCHOR", law: "ONE LOAD AT A TIME", image: "/sleeper-world.png", light: false,
    description: "Hold and release pressure to awaken districts without losing the underlying body.",
  },
  {
    id: "maps", number: "04", href: "/wrong-maps", title: "ALL MAPS ARE WRONG", subtitle: "SOME BECOME DOORS",
    operator: "FOLD", law: "ROTATE THE MODEL, NOT THE WORLD", image: "/labyrinth.png", light: true,
    description: "Rotate a scrambled schematic until one continuous route becomes true.",
  },
  {
    id: "rules", number: "05", href: "/rules-with-authors", title: "RULES WITH AUTHORS", subtitle: "A COUNCIL RUNTIME",
    operator: "GOVERN", law: "MAKE THE WARDEN VISIBLE", image: "/prison-atlas.png", light: true,
    description: "Draft a six-rule constitution while freedom, coherence, and memory answer back.",
  },
  {
    id: "bridge", number: "06", href: "/signal-form", title: "BETWEEN SIGNAL AND FORM", subtitle: "THE TETHER TEST",
    operator: "TETHER", law: "HOLD FAST / LET FLY", image: "/keris-cut.png", light: true,
    description: "Cross a changing span by countering pressures from both towers.",
  },
  {
    id: "cultivators", number: "07", href: "/cultivators", title: "CULTIVATORS", subtitle: "THE TRANSFER BENCH",
    operator: "CARRY", law: "PRESERVE THE RETRIEVAL PATH", image: "/cultivators.png", light: true,
    description: "Graft each operator to its enactment; a mark without retrieval remains decoration.",
  },
  {
    id: "vertical", number: "08", href: "/vertical-river", title: "VERTICAL RIVER", subtitle: "A GRAVITY SENTENCE",
    operator: "ESCAPE", law: "CORRECT THE MODEL", image: "/cloudbone.png", light: true,
    description: "Flip lateral gravity while the river rises through cloudbone towers.",
  },
  {
    id: "confluence", number: "09", href: "/confluence-engine", title: "THE CONFLUENCE ENGINE", subtitle: "COUNCIL OF SELVES",
    operator: "INTEGRATE", law: "ONE FIELD, MANY OFFICES", image: "/confluence-engine.png", light: true,
    description: "Rotate a junction so concurrent signals reach the offices able to answer them.",
  },
  {
    id: "ridge", number: "10", href: "/ministry-ridge", title: "MINISTRY RIDGE", subtitle: "DREAM LOG / SEALED",
    operator: "MEASURE", law: "ALIGN BEFORE RETRIEVAL", image: "/ministry-ridge.png", light: false,
    description: "Turn coupled celestial rings until the archive and its sky share one coordinate.",
  },
];

export function fieldDefinition(id: FieldId) {
  const field = FIELD_DEFINITIONS.find((candidate) => candidate.id === id);
  if (!field) throw new Error(`Unknown field: ${id}`);
  return field;
}

export function fieldMetadata(id: FieldId): Metadata {
  const field = fieldDefinition(id);
  const origin = "https://sleeper-one-return.metaname.chatgpt.site";
  return {
    title: `SLEEPER ${field.number} // ${field.title}`,
    description: field.description,
    openGraph: {
      title: `SLEEPER ${field.number} // ${field.title}`,
      description: field.description,
      type: "website",
      images: [{ url: `${origin}${field.image}`, alt: `${field.title} field painting` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `SLEEPER ${field.number} // ${field.title}`,
      description: field.description,
      images: [`${origin}${field.image}`],
    },
  };
}
