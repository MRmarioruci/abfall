// Curated "Did you know" content. Two pools:
//  • per-stream tips that surface contextually when a pickup is coming up
//  • generic recycling facts that rotate when there's nothing scheduled
//
// Pure local content — no API, no key, no network. Picks deterministically
// from the day-of-year so the same fact stays put for ~24h then rotates.

import type { WasteStreamId } from "../theme/colors";

const STREAM_TIPS: Partial<Record<WasteStreamId, string[]>> = {
  papier: [
    "Pizza boxes with grease belong in green waste, not paper — the oil contaminates the pulp during recycling.",
    "Receipts on thermal paper aren't recyclable. They contain BPA and go in regular trash.",
    "Recycled paper saves about 70% of the energy a fresh sheet needs to make.",
    "Staples and paperclips are fine to leave in — sorting machines remove them.",
    "A single ton of recycled paper saves around 17 trees and 26,000 liters of water.",
  ],
  karton: [
    "Flatten cardboard boxes before putting them out — uncrushed boxes can take up to four times the volume.",
    "Wax-coated and tetra-pak cartons aren't cardboard. They need their own collection.",
    "Tape and labels are usually fine to leave on — recyclers screen them out.",
    "Cardboard can be recycled 5–7 times before the fibers get too short to use.",
  ],
  kehricht: [
    "Reducing food waste is the single biggest move you can make: about a third of household trash by weight is food.",
    "The cheapest waste is the kind you never bought. Bulk and refill stations cut packaging by 80–90%.",
    "Black bin liners aren't required — many systems prefer untied or transparent bags for safety.",
  ],
  gruengut: [
    "Meat, dairy, and cooked food don't belong in green waste in most municipalities — they attract pests in compost piles.",
    "Eggshells are great compost feedstock. Crush them first so they break down faster.",
    "Citrus peels and onion skins are fine in moderation, despite the myth. Worms just prefer variety.",
    "Coffee grounds give compost a nitrogen boost. Filters can go in too.",
  ],
  metall: [
    "Aluminum cans can be recycled infinitely with no loss in quality — and recycling one saves enough energy to run a TV for 3 hours.",
    "Rinse cans briefly. Food residue isn't a deal-breaker but it keeps the collection area cleaner.",
    "Foil and bottle caps count as metal too. Roll loose foil into a ball so it doesn't fly out of the sort line.",
  ],
  altmetall: [
    "Old pots, pans, and tools all go to scrap metal — even rusty ones. The smelter doesn't mind.",
    "Batteries are NOT scrap metal. They need their own drop-off — lithium ones can start fires in trucks.",
  ],
  sperrgut: [
    "Most bulky-waste collection is free a couple of times a year. Check your municipality's site before booking.",
    "Furniture in usable condition can usually go to a charity shop or a Brockenhaus — diverts it from incineration entirely.",
  ],
  textilien: [
    "Even torn or stained clothes can be recycled — they're shredded into industrial rags or insulation.",
    "Pairs of shoes should be tied together by their laces. Single shoes can't be paired up at the sorting facility.",
    "About 60% of clothing ends up incinerated globally. Textile collection is one of the highest-leverage recycling habits.",
  ],
  sonderabfall: [
    "Old paint, solvents, and chemicals must never go in regular trash — they leach into incinerator ash.",
    "Most pharmacies take back expired medication for free. Don't flush them.",
    "LED and fluorescent bulbs contain mercury traces. Drop them at any collection point, never in the bin.",
  ],
  bio: [
    "Compost cuts methane emissions that food would otherwise produce in landfill — about a third of household climate impact.",
    "A handful of soil contains more living organisms than there are humans on Earth.",
  ],
};

const GENERIC_FACTS: string[] = [
  "Switzerland recycles around 53% of its waste — one of the highest rates in Europe.",
  "Glass can be recycled indefinitely. A bottle made today might contain material that was first manufactured in the 1950s.",
  "The average household throws away about 90 kg of food per person per year. Composting recovers most of it.",
  "Recycling one aluminum can saves enough energy to power a laptop for 5 hours.",
  "Plastic takes 450+ years to break down in landfill. Recycling cuts that to weeks of useful afterlife.",
  "Most waste-to-energy plants in Switzerland recover the heat to warm thousands of homes.",
  "A reusable shopping bag breaks even with a single-use plastic one after about 11 uses.",
  "Pizza boxes are tricky: clean lids go in paper, oily bottoms go in green waste.",
  "Batteries dropped in the regular bin start truck fires. Every supermarket has a free collection bin.",
  "PET bottles are recycled into fleece, carpet, even new bottles — Switzerland recovers around 82% of them.",
  "Tetra Pak cartons are layered paper, plastic, and aluminum. They need their own collection — paper bins can't process them.",
  "Composted organic waste returns nutrients to soil. Landfilled food just rots and emits methane.",
  "Reusing one glass jar saves the energy needed to make a new one — about as much as running a hairdryer for 10 minutes.",
];

// Deterministic pick: same day → same fact, next day → different fact.
function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

export function getDailyFunFact(stream?: WasteStreamId): string {
  const pool = (stream && STREAM_TIPS[stream]) || GENERIC_FACTS;
  // Mix stream into the seed so different streams on the same day surface
  // different tips — otherwise everyone's screen would show the same one.
  const streamSeed = stream
    ? stream.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
    : 0;
  const idx = (dayOfYear() + streamSeed) % pool.length;
  return pool[idx];
}

/**
 * Returns the merged fact pool for a stream — stream-specific tips first
 * (most relevant to the user's next pickup) followed by generic facts.
 * Used by the home card to rotate through every few seconds rather than
 * pinning to a single fact-of-the-day.
 *
 * Output is deduplicated and stable across calls so the cycling animation
 * doesn't see its underlying array reshuffle.
 */
export function getFunFactPool(stream?: WasteStreamId): string[] {
  const streamPool = (stream && STREAM_TIPS[stream]) || [];
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const f of [...streamPool, ...GENERIC_FACTS]) {
    if (seen.has(f)) continue;
    seen.add(f);
    merged.push(f);
  }
  return merged;
}
