// Curated "Did you know" content. Two pools:
//  • per-stream tips that surface contextually when a pickup is coming up
//  • generic recycling facts that rotate when there's nothing scheduled
//
// Pure local content — no API, no key, no network. Picks deterministically
// from the day-of-year so the same fact stays put for ~24h then rotates.
//
// Every fact is one object holding all four languages, so the translations
// can't drift out of alignment and a missing language is a type error.
// German follows Swiss conventions ("ss", never "ß").

import type { Locale } from "../i18n";
import type { WasteStreamId } from "../theme/colors";

type Fact = Record<Locale, string>;

// Short, global and eye-catching: no country-specific numbers or rules
// that only hold in one place. Figures are the widely published ones
// (FAO, OECD, Global E-waste Monitor, World Bank, industry bodies).

// Facts that appear both as a stream tip and in the generic pool.
const FOOD_WASTE: Fact = {
  en: "Around a third of all food produced worldwide is lost or wasted.",
  de: "Rund ein Drittel aller Lebensmittel weltweit geht verloren oder landet im Abfall.",
  fr: "Environ un tiers de la nourriture produite dans le monde est perdue ou gaspillée.",
  it: "Circa un terzo del cibo prodotto nel mondo va perso o sprecato.",
};
const GLASS_ENDLESS: Fact = {
  en: "Glass can be recycled endlessly without losing any quality.",
  de: "Glas lässt sich endlos recyceln, ohne an Qualität zu verlieren.",
  fr: "Le verre se recycle à l'infini sans perdre en qualité.",
  it: "Il vetro si ricicla all'infinito senza perdere qualità.",
};
const PLASTIC_9: Fact = {
  en: "Only about 9% of all plastic ever made has been recycled.",
  de: "Nur etwa 9 % des jemals hergestellten Plastiks wurden recycelt.",
  fr: "Seuls 9 % environ de tout le plastique jamais produit ont été recyclés.",
  it: "Solo il 9% circa di tutta la plastica mai prodotta è stato riciclato.",
};
const ALU_ENERGY: Fact = {
  en: "Recycling aluminium takes about 95% less energy than making it from ore.",
  de: "Aluminium zu recyceln braucht rund 95 % weniger Energie als die Herstellung aus Erz.",
  fr: "Recycler l'aluminium demande environ 95 % d'énergie en moins que de le produire à partir du minerai.",
  it: "Riciclare l'alluminio richiede circa il 95% di energia in meno che produrlo dal minerale.",
};
const ALU_IN_USE: Fact = {
  en: "About three quarters of all aluminium ever made is still in use today.",
  de: "Rund drei Viertel des jemals hergestellten Aluminiums sind heute noch in Gebrauch.",
  fr: "Environ trois quarts de tout l'aluminium jamais produit sont encore utilisés aujourd'hui.",
  it: "Circa tre quarti di tutto l'alluminio mai prodotto sono ancora in uso oggi.",
};
const PHONES_GOLD: Fact = {
  en: "A tonne of old phones holds far more gold than a tonne of gold ore.",
  de: "Eine Tonne alter Handys enthält weit mehr Gold als eine Tonne Golderz.",
  fr: "Une tonne de vieux téléphones contient bien plus d'or qu'une tonne de minerai d'or.",
  it: "Una tonnellata di vecchi telefoni contiene molto più oro di una tonnellata di minerale aurifero.",
};
const TSHIRT_WATER: Fact = {
  en: "Making one cotton T-shirt takes around 2,700 litres of water.",
  de: "Für ein einziges Baumwoll-T-Shirt braucht es rund 2700 Liter Wasser.",
  fr: "Il faut environ 2700 litres d'eau pour fabriquer un seul t-shirt en coton.",
  it: "Per produrre una sola maglietta di cotone servono circa 2700 litri d'acqua.",
};
const METHANE: Fact = {
  en: "Food rotting in landfill releases methane, around 80 times stronger than CO₂ over 20 years.",
  de: "Essensreste auf Deponien setzen Methan frei, über 20 Jahre rund 80-mal stärker als CO₂.",
  fr: "Les aliments en décharge libèrent du méthane, environ 80 fois plus puissant que le CO₂ sur 20 ans.",
  it: "Il cibo in discarica rilascia metano, circa 80 volte più potente della CO₂ in 20 anni.",
};

const STREAM_TIPS: Partial<Record<WasteStreamId, Fact[]>> = {
  papier: [
    {
      en: "Paper fibres survive about 5 to 7 trips through recycling before they get too short to use.",
      de: "Papierfasern überstehen etwa 5 bis 7 Recyclingrunden, bevor sie zu kurz werden.",
      fr: "Les fibres de papier supportent 5 à 7 recyclages avant de devenir trop courtes.",
      it: "Le fibre della carta reggono da 5 a 7 cicli di riciclo prima di diventare troppo corte.",
    },
    {
      en: "Shiny till receipts are usually thermal paper, which doesn't recycle. They go in the rubbish.",
      de: "Glänzende Kassenzettel sind meist Thermopapier und nicht rezyklierbar. Ab in den Kehricht.",
      fr: "Les tickets de caisse brillants sont souvent en papier thermique, non recyclable. Aux ordures.",
      it: "Gli scontrini lucidi sono quasi sempre carta termica, non riciclabile. Vanno nei rifiuti.",
    },
    {
      en: "Staples and paperclips can stay in: the recycling plant pulls them out with magnets.",
      de: "Heft- und Büroklammern dürfen dranbleiben: Die Anlage zieht sie mit Magneten raus.",
      fr: "Agrafes et trombones peuvent rester : l'usine de recyclage les retire avec des aimants.",
      it: "Graffette e fermagli possono restare: l'impianto di riciclo li toglie con le calamite.",
    },
    {
      en: "Greasy pizza boxes trip up paper recycling. Tear off the clean lid and recycle just that.",
      de: "Fettige Pizzaschachteln stören das Recycling. Den sauberen Deckel abreissen und nur den rezyklieren.",
      fr: "Les boîtes à pizza grasses gênent le recyclage. Détachez le couvercle propre et recyclez-le seul.",
      it: "I cartoni della pizza unti ostacolano il riciclo. Stacca il coperchio pulito e ricicla solo quello.",
    },
  ],
  karton: [
    {
      en: "Flatten your boxes: a squashed box takes a fraction of the space, so more fits in every truck.",
      de: "Schachteln flach drücken: So brauchen sie viel weniger Platz und mehr passt in jeden Lastwagen.",
      fr: "Aplatissez vos cartons : ils prennent bien moins de place et chaque camion en emporte plus.",
      it: "Schiaccia gli scatoloni: occupano molto meno spazio e in ogni camion ne entrano di più.",
    },
    {
      en: "Tape and labels can usually stay on cardboard. Recyclers screen them out.",
      de: "Klebeband und Etiketten dürfen meist am Karton bleiben. Die Recycler sortieren sie aus.",
      fr: "Ruban adhésif et étiquettes peuvent en général rester sur le carton : le recycleur les trie.",
      it: "Nastro adesivo ed etichette di solito possono restare sul cartone: li separa il riciclatore.",
    },
    {
      en: "A cardboard box can come back as a new box in as little as two weeks.",
      de: "Aus einer Kartonschachtel kann in nur zwei Wochen eine neue werden.",
      fr: "Un carton peut revenir sous forme de nouveau carton en deux semaines à peine.",
      it: "Uno scatolone può tornare come scatolone nuovo in appena due settimane.",
    },
  ],
  kehricht: [
    FOOD_WASTE,
    {
      en: "The world throws away over 2 billion tonnes of household waste a year, and it's rising.",
      de: "Weltweit fallen jährlich über 2 Milliarden Tonnen Siedlungsabfall an, Tendenz steigend.",
      fr: "Le monde jette plus de 2 milliards de tonnes de déchets ménagers par an, et ça augmente.",
      it: "Il mondo butta via oltre 2 miliardi di tonnellate di rifiuti urbani all'anno, e in aumento.",
    },
    {
      en: "The cheapest rubbish is the kind you never buy: refills and loose produce skip the packaging.",
      de: "Der günstigste Kehricht ist der, den man nie kauft: Nachfüllpacks und Offenware sparen Verpackung.",
      fr: "Les ordures les moins chères sont celles qu'on n'achète pas : recharges et vrac évitent l'emballage.",
      it: "I rifiuti più economici sono quelli che non compri: ricariche e sfuso evitano l'imballaggio.",
    },
  ],
  gruengut: [
    {
      en: "Crushed eggshells and coffee grounds are compost gold.",
      de: "Zerdrückte Eierschalen und Kaffeesatz sind Gold für den Kompost.",
      fr: "Coquilles d'œufs écrasées et marc de café : de l'or pour le compost.",
      it: "Gusci d'uovo sbriciolati e fondi di caffè sono oro per il compost.",
    },
    {
      en: "Leaves, grass and branches turn into rich compost in just a few months.",
      de: "Laub, Gras und Äste werden in wenigen Monaten zu nährstoffreichem Kompost.",
      fr: "Feuilles, herbe et branches deviennent un compost riche en quelques mois.",
      it: "Foglie, erba e rami diventano compost ricco in pochi mesi.",
    },
    {
      en: "Compost locks carbon back into the soil instead of the air.",
      de: "Kompost bindet Kohlenstoff im Boden statt in der Luft.",
      fr: "Le compost fixe le carbone dans le sol plutôt que dans l'air.",
      it: "Il compost trattiene il carbonio nel suolo invece che nell'aria.",
    },
  ],
  bio: [
    METHANE,
    {
      en: "A handful of healthy soil holds more living things than there are people on Earth.",
      de: "Eine Handvoll gesunder Erde enthält mehr Lebewesen, als es Menschen auf der Erde gibt.",
      fr: "Une poignée de sol sain abrite plus d'êtres vivants qu'il n'y a d'humains sur Terre.",
      it: "Una manciata di terreno sano contiene più esseri viventi delle persone sulla Terra.",
    },
    {
      en: "Your food scraps can become biogas that powers buses and heats homes.",
      de: "Deine Rüstabfälle können zu Biogas werden, das Busse antreibt und Wohnungen heizt.",
      fr: "Vos restes alimentaires peuvent devenir du biogaz qui fait rouler des bus et chauffe des maisons.",
      it: "I tuoi scarti di cucina possono diventare biogas che muove autobus e scalda case.",
    },
  ],
  metall: [
    {
      en: "A recycled aluminium can can be back on the shelf as a new can in about 60 days.",
      de: "Eine recycelte Aludose kann in rund 60 Tagen als neue Dose wieder im Regal stehen.",
      fr: "Une canette en alu recyclée peut revenir en rayon sous forme de canette neuve en 60 jours environ.",
      it: "Una lattina di alluminio riciclata può tornare sugli scaffali come lattina nuova in circa 60 giorni.",
    },
    ALU_ENERGY,
    ALU_IN_USE,
  ],
  altmetall: [
    {
      en: "Steel is the world's most recycled material, and it never wears out.",
      de: "Stahl ist das meistrecycelte Material der Welt und nutzt sich dabei nie ab.",
      fr: "L'acier est le matériau le plus recyclé au monde, et il ne s'use jamais.",
      it: "L'acciaio è il materiale più riciclato al mondo, e non si consuma mai.",
    },
    {
      en: "Batteries don't go with scrap metal: lithium cells can spark fires in collection trucks.",
      de: "Batterien gehören nicht zum Altmetall: Lithiumzellen können im Sammelfahrzeug Brände auslösen.",
      fr: "Les piles ne vont pas avec la ferraille : les batteries lithium peuvent enflammer un camion.",
      it: "Le batterie non vanno con i rottami: le celle al litio possono incendiare i camion di raccolta.",
    },
  ],
  sperrgut: [
    {
      en: "Old furniture often has a second life: second-hand shops and swap groups take a lot of it.",
      de: "Alte Möbel bekommen oft ein zweites Leben: Brockenhäuser und Tauschgruppen nehmen vieles.",
      fr: "Les vieux meubles ont souvent une seconde vie : ressourceries et groupes d'échange en prennent beaucoup.",
      it: "I vecchi mobili hanno spesso una seconda vita: mercatini dell'usato e gruppi di scambio ne prendono tanti.",
    },
    {
      en: "Many cities pick up bulky items for free a few times a year. Worth checking before you pay.",
      de: "Viele Gemeinden holen Sperrgut ein paar Mal im Jahr gratis ab. Vor dem Bezahlen nachschauen.",
      fr: "Beaucoup de villes ramassent les encombrants gratuitement quelques fois par an. À vérifier avant de payer.",
      it: "Molti comuni ritirano gli ingombranti gratis qualche volta all'anno. Meglio verificare prima di pagare.",
    },
  ],
  textilien: [
    TSHIRT_WATER,
    {
      en: "Even torn clothes are useful: they're shredded into insulation and cleaning rags.",
      de: "Auch kaputte Kleider sind nützlich: Sie werden zu Dämmstoff und Putzlappen.",
      fr: "Même déchirés, les vêtements servent : ils deviennent isolant et chiffons.",
      it: "Anche i vestiti strappati servono: diventano isolante e stracci per pulire.",
    },
    {
      en: "Tie shoes together by their laces, or the pair may never meet again at the sorting plant.",
      de: "Schuhe an den Schnürsenkeln zusammenbinden, sonst finden sie sich in der Sortieranlage nie wieder.",
      fr: "Attachez vos chaussures par les lacets, sinon la paire risque de ne jamais se retrouver au tri.",
      it: "Lega le scarpe per i lacci, o il paio rischia di non ritrovarsi più all'impianto di selezione.",
    },
  ],
  sonderabfall: [
    {
      en: "Only about a quarter of the world's e-waste is properly collected and recycled.",
      de: "Nur etwa ein Viertel des Elektroschrotts weltweit wird korrekt gesammelt und recycelt.",
      fr: "Seul un quart environ des déchets électroniques du monde est correctement collecté et recyclé.",
      it: "Solo un quarto circa dei rifiuti elettronici nel mondo viene raccolto e riciclato correttamente.",
    },
    PHONES_GOLD,
    {
      en: "Pharmacies often take back old medicine for free. Never flush it.",
      de: "Apotheken nehmen alte Medikamente oft gratis zurück. Nie ins WC spülen.",
      fr: "Les pharmacies reprennent souvent les vieux médicaments gratuitement. Jamais dans les toilettes.",
      it: "Le farmacie spesso ritirano gratis i vecchi farmaci. Mai buttarli nel WC.",
    },
  ],
  verpackung: [
    PLASTIC_9,
    {
      en: "Recycled PET bottles come back as fleece jackets, carpets and new bottles.",
      de: "Recycelte PET-Flaschen kommen als Faserpelzjacken, Teppiche und neue Flaschen zurück.",
      fr: "Les bouteilles en PET recyclées reviennent en polaires, en moquettes et en nouvelles bouteilles.",
      it: "Le bottiglie in PET riciclate tornano come pile, moquette e nuove bottiglie.",
    },
    {
      en: "Squash bottles and keep caps on. They sort better that way in most systems.",
      de: "Flaschen zusammendrücken und Deckel drauflassen. So lassen sie sich meist besser sortieren.",
      fr: "Écrasez les bouteilles et laissez les bouchons. Elles se trient mieux ainsi dans la plupart des filières.",
      it: "Schiaccia le bottiglie e lascia i tappi. Così si selezionano meglio nella maggior parte dei sistemi.",
    },
  ],
  glas: [
    GLASS_ENDLESS,
    {
      en: "A recycled glass bottle can be back on the shelf in about a month.",
      de: "Eine recycelte Glasflasche kann in rund einem Monat wieder im Regal stehen.",
      fr: "Une bouteille en verre recyclée peut revenir en rayon en un mois environ.",
      it: "Una bottiglia di vetro riciclata può tornare sugli scaffali in circa un mese.",
    },
    {
      en: "Sorting glass by colour matters: clear glass can only be made from clear glass.",
      de: "Glas nach Farbe trennen lohnt sich: Weissglas entsteht nur aus Weissglas.",
      fr: "Trier le verre par couleur compte : le verre incolore ne se fait qu'avec du verre incolore.",
      it: "Separare il vetro per colore conta: il vetro trasparente si fa solo da vetro trasparente.",
    },
  ],
};

const GENERIC_FACTS: Fact[] = [
  FOOD_WASTE,
  GLASS_ENDLESS,
  {
    en: "A recycled aluminium can can be back on the shelf in about 60 days.",
    de: "Eine recycelte Aludose kann in rund 60 Tagen wieder im Regal stehen.",
    fr: "Une canette en alu recyclée peut revenir en rayon en 60 jours environ.",
    it: "Una lattina di alluminio riciclata può tornare sugli scaffali in circa 60 giorni.",
  },
  PLASTIC_9,
  {
    en: "The world made about 62 million tonnes of e-waste in 2022. Less than a quarter was recycled.",
    de: "2022 fielen weltweit rund 62 Millionen Tonnen Elektroschrott an. Weniger als ein Viertel wurde recycelt.",
    fr: "En 2022, le monde a produit environ 62 millions de tonnes de déchets électroniques. Moins d'un quart a été recyclé.",
    it: "Nel 2022 il mondo ha prodotto circa 62 milioni di tonnellate di rifiuti elettronici: meno di un quarto riciclato.",
  },
  ALU_ENERGY,
  PHONES_GOLD,
  ALU_IN_USE,
  {
    en: "Steel is the world's most recycled material.",
    de: "Stahl ist das meistrecycelte Material der Welt.",
    fr: "L'acier est le matériau le plus recyclé au monde.",
    it: "L'acciaio è il materiale più riciclato al mondo.",
  },
  TSHIRT_WATER,
  METHANE,
  {
    en: "A reusable bag pays off after enough trips. The trick is simply to keep using it.",
    de: "Eine Mehrwegtasche lohnt sich nach genug Einkäufen. Der Trick: sie einfach weiter benutzen.",
    fr: "Un sac réutilisable devient rentable après assez de courses. L'astuce : continuer à s'en servir.",
    it: "Una borsa riutilizzabile ripaga dopo abbastanza spese. Il trucco è continuare a usarla.",
  },
];

// Any locale without a table (or an unexpected value) falls back to English.
function localize(fact: Fact, locale: string): string {
  return (fact as Partial<Record<string, string>>)[locale] || fact.en;
}

// Deterministic pick: same day → same fact, next day → different fact.
function dayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

export function getDailyFunFact(stream: WasteStreamId | undefined, locale: Locale): string {
  const pool = (stream && STREAM_TIPS[stream]) || GENERIC_FACTS;
  // Mix stream into the seed so different streams on the same day surface
  // different tips — otherwise everyone's screen would show the same one.
  const streamSeed = stream
    ? stream.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
    : 0;
  const idx = (dayOfYear() + streamSeed) % pool.length;
  return localize(pool[idx], locale);
}

/**
 * Returns the merged fact pool for a stream, in the given locale — stream-
 * specific tips first (most relevant to the user's next pickup) followed by
 * generic facts. Used by the home card to rotate through every few seconds
 * rather than pinning to a single fact-of-the-day.
 *
 * Output is deduplicated and stable across calls so the cycling animation
 * doesn't see its underlying array reshuffle.
 */
export function getFunFactPool(stream: WasteStreamId | undefined, locale: Locale): string[] {
  const streamPool = (stream && STREAM_TIPS[stream]) || [];
  const merged: string[] = [];
  const seen = new Set<Fact>();
  for (const f of [...streamPool, ...GENERIC_FACTS]) {
    if (seen.has(f)) continue;
    seen.add(f);
    merged.push(localize(f, locale));
  }
  return merged;
}
