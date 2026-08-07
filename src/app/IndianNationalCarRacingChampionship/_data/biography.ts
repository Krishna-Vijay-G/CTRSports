// ─────────────────────────────────────────────────────────────
//  Chennai Turbo Riders — Biography ("Our Story") data model.
//  All narrative copy is transcribed verbatim from World CTR Deck V4.
//  The page + sticky rail derive their order entirely from this array.
// ─────────────────────────────────────────────────────────────

export type ChapterVariant =
  | "hero"
  | "cards"
  | "timeline"
  | "nationalGrid"
  | "highlights"
  | "ladder"
  | "academy"
  | "club"
  | "roadmap"
  | "registration"
  | "unified"
  | "finalLap";

export type IconKey =
  | "people"
  | "route"
  | "trophy"
  | "flag"
  | "building"
  | "handshake"
  | "chart"
  | "globe"
  | "wheel"
  | "cap"
  | "medal";

export interface CardItem {
  icon: IconKey;
  image: string;
  alt: string;
  text: string;
}

export interface TimelineItem {
  year: string;
  label?: string;
  text: string;
  highlight?: string; // substring rendered with the yellow marker bar
  icon: IconKey;
}

export interface PartnerItem {
  name: string;
  logo?: string;
}

export interface StageItem {
  title: string;
  text: string;
}

export interface TeamItem {
  name: string;
  logo: string;
}

export interface CalloutItem {
  title: string;
  text: string;
}

export interface CtaItem {
  label: string;
  href: string;
  kind: "gold" | "navy" | "ghost" | "ghost-light";
  external?: boolean;
}

export interface AcademyTile {
  label: string;
  image: string;
  alt: string;
}

export interface RoundItem {
  round: string;
  dates: string;
  venue: string;
  city: string;
  tba?: boolean;
}

export interface SigningShot {
  image: string;
  alt: string;
}

/** Indian National Car Racing Championship — real content from @incrc_. */
export interface IncrcContent {
  instagram: string;
  handle: string;
  tagline: string;
  season: string;
  seasonKicker: string;
  vision: { label: string; description: string }[];
  oneNationImage: string;
  oneNationAlt: string;
  oneNationVenue: string;
  carsImage: string;
  carsAlt: string;
  familyImage: string;
  familyAlt: string;
  familyLead: string;
  familyQuote: string;
  venues: { number: string; name: string; city: string }[];
  rounds: RoundItem[];
  signingTitle: string;
  signingText: string;
  signing: SigningShot[];
  stats: { value: string; label: string }[];
}

export interface Chapter {
  id: string;
  number: string;
  eyebrow?: string;
  kicker?: string;
  title: string;
  titleLines?: string[];
  variant: ChapterVariant;
  theme: "light" | "dark";
  /** which side the media sits on for split layouts */
  align?: "left" | "right";
  lead?: string;
  sub?: string;
  bullets?: string[];
  cards?: CardItem[];
  timeline?: TimelineItem[];
  partners?: PartnerItem[];
  partnersHeadline?: string;
  incrc?: IncrcContent;
  highlightsTitle?: string;
  trainingTitle?: string;
  trainingList?: string[];
  collabTitle?: string;
  collabList?: string[];
  academyTiles?: AcademyTile[];
  ladder?: string[];
  stages?: StageItem[];
  teams?: TeamItem[];
  teamsCaption?: string;
  quote?: string;
  footerStrip?: string;
  image?: string;
  imageAlt?: string;
  plate?: string;
  video?: string;
  poster?: string;
  callouts?: CalloutItem[];
  ctas?: CtaItem[];
  closingHeadline?: string;
}

export interface Contact {
  email: string;
  phone: string;
  address: string;
  founded: string;
  city: string;
}

export interface Social {
  label: string;
  handle: string;
  href: string;
}

export const contact: Contact = {
  email: "info@chennaiturboriders.in",
  phone: "+91 95000 16999",
  address:
    "#1, 1st Main Road, Kasthuri Bai Nagar, Adayar, Chennai – 600020",
  founded: "2022",
  city: "Chennai, Tamil Nadu, India",
};

export const socials: Social[] = [
  { label: "Instagram", handle: "chennaiturboriders", href: "https://www.instagram.com/chennaiturboriders" },
  { label: "Facebook", handle: "chennaiturboriders", href: "https://www.facebook.com/chennaiturboriders" },
  { label: "X", handle: "chennaiturbo", href: "https://twitter.com/chennaiturbo" },
  { label: "YouTube", handle: "@chennaiturboriders", href: "https://www.youtube.com/@chennaiturboriders" },
];

export const EAGLE = "/images/journey/CTR_yellow.png";

export const chapters: Chapter[] = [
  // 00 — HERO ────────────────────────────────────────────────
  {
    id: "hero",
    number: "00",
    variant: "hero",
    theme: "dark",
    eyebrow: "BUILT TO WIN · CHENNAI TURBO RIDERS",
    title: "Engineering Speed. Delivering Dominance.",
    titleLines: ["Engineering Speed.", "Delivering Dominance."],
    sub: "The story of India's Turbo Riders — from passion to purpose, from track to legacy.",
    video: "/video/background.mp4",
    poster: "/images/car/hero.jpg",
    image: "/images/car/hero.jpg",
    imageAlt:
      "Black-and-gold CTR Formula 4 car #37 on a wet track with spray and headlight glare.",
    ctas: [
      { label: "Explore the Journey", href: "#origin", kind: "gold" },
      { label: "Watch the Film", href: "#origin", kind: "ghost-light" },
    ],
  },

  // 01 — THE ORIGIN OF CTR ───────────────────────────────────
  {
    id: "origin",
    number: "01",
    variant: "cards",
    theme: "light",
    title: "The Origin of CTR",
    quote: "From Passion to Purpose — From Track to Legacy.",
    cards: [
      {
        icon: "people",
        image: "/images/journey/origin/garage.jpg",
        alt: "CTR engineers working on a gold-and-black F4 car #37 in the garage.",
        text: "Professional motorsports team dedicated to nurturing racing talent and promoting motorsports culture in India.",
      },
      {
        icon: "route",
        image: "/images/journey/origin/karting.jpg",
        alt: "Karting-to-F4 progression in gold-and-black CTR livery.",
        text: "Creating structured opportunities for drivers and engineers to grow from grassroots racing to professional championships.",
      },
      {
        icon: "trophy",
        image: "/images/journey/origin/trophy.jpg",
        alt: "Silver championship trophy on a CTR podium at golden hour.",
        text: "Built on performance, precision, and passion to establish a lasting legacy in competitive motorsports.",
      },
    ],
  },

  // 02 — CTR GRID ENTRY ──────────────────────────────────────
  {
    id: "grid-entry",
    number: "02",
    variant: "timeline",
    theme: "light",
    align: "left",
    title: "CTR Grid Entry",
    kicker: "From Debut to Dominance",
    image: "/images/journey/panels/grid-entry.jpg",
    imageAlt:
      "CTR driver in navy-and-gold suit celebrating with arms raised beside a pit-lane image.",
    quote: "From Debut to Dominance.",
    timeline: [
      {
        year: "2022",
        icon: "flag",
        highlight:
          "CTR hit the track in 2022 as a franchise team in the Indian Racing League (IRL)",
        text: "CTR hit the track in 2022 as a franchise team in the Indian Racing League (IRL), competing with Wolf GB08 cars and making an immediate impact as multiple-time vice-champions while finishing 2nd runner-up in the team championship.",
      },
      {
        year: "2023",
        icon: "trophy",
        highlight: "In 2023, CTR entered the F4 Indian Championship",
        text: "In 2023, CTR entered the F4 Indian Championship and secured a championship victory in its debut season, proving its dominance in driver development and race performance. The 1st Ever champion in the very 1st Formula 4 championship of India.",
      },
      {
        year: "2024",
        icon: "building",
        highlight: "By 2024, CTR evolved into Chennai Turbo Riders Pvt Ltd",
        text: "By 2024, CTR evolved into Chennai Turbo Riders Pvt Ltd, building a strong professional foundation in Indian motorsport.",
      },
    ],
  },

  // 03 — CTR ACCELERATION ────────────────────────────────────
  {
    id: "acceleration",
    number: "03",
    variant: "timeline",
    theme: "light",
    align: "right",
    title: "CTR Acceleration",
    image: "/images/journey/panels/acceleration.jpg",
    imageAlt: "Navy CTR flag with the gold eagle waving over an empty race straight.",
    timeline: [
      {
        year: "2025",
        label: "Expanding the Ecosystem",
        icon: "people",
        text: "In 2025, CTR expanded into a full motorsports ecosystem — focusing on driver scouting, engineering innovation and national-level talent development.",
      },
      {
        year: "2026",
        label: "Building the Foundation",
        icon: "handshake",
        text: "In 2026, CTR became a registered member of Federation of Motor Sports Clubs of India, partnered with JK Tyre for one and only national championship and prepared to launch a structured karting league while developing a 4-stroke go-kart with BHIER students.",
      },
      {
        year: "2023 – 2025",
        label: "Racing with Results",
        icon: "trophy",
        text: "With multiple IRL podium finishes and F4 championship wins in 2023 and 2025, CTR continues to build champions and scale Indian motorsport globally.",
      },
    ],
  },

  // 04 — CTR NATIONAL GRID ───────────────────────────────────
  {
    id: "national-grid",
    number: "04",
    variant: "nationalGrid",
    theme: "light",
    align: "right",
    title: "CTR National Grid",
    partners: [
      { name: "CTR", logo: EAGLE },
      { name: "JK Tyre", logo: "/images/journey/logos/jktyre.png" },
      { name: "FMSCI", logo: "/images/sponsors/fmsci_full.png" },
    ],
    partnersHeadline:
      "India's Biggest Multi-Category Indian National Car Racing Championship 2026",
    bullets: [
      "CTR leads a national motorsport ecosystem uniting 7 racing categories under one championship.",
      "A complete experience — racing, live audiences, fan ecosystems, entertainment, OTT broadcast and sponsorship integration.",
      "CTR is not organizing the future — CTR is building it.",
    ],
    image: "/images/journey/panels/national-grid.jpg",
    imageAlt:
      "CTR driver in navy-and-gold suit, fist raised, beside the MIGALE F4 #37 car on a gold speed-streak background.",
    incrc: {
      instagram: "https://www.instagram.com/incrc_",
      handle: "@incrc_",
      tagline: "One Nation · One Championship",
      season: "The 2026 Season",
      seasonKicker: "FMSCI Indian National Car Racing Championship",
      vision: [
        { label: "Elevate Indian Motorsport", description: "Raise the standard of competitive racing across all categories on India's finest circuits." },
        { label: "Inspire the Next Generation", description: "Nurture and develop the next wave of Indian racing champions from grassroots to national level." },
        { label: "Build a World-Class Racing Ecosystem", description: "Create a self-sustaining motorsport infrastructure with safety, broadcast and fan engagement at its core." },
        { label: "Position India as a Global Destination", description: "Establish India as a premier motorsport destination, attracting international talent and investment." },
      ],
      oneNationImage: "/images/journey/incrc/one-nation.jpg",
      oneNationAlt:
        "One Nation, One Championship — 3D render of the Kari Motor Speedway circuit, presented by CTR × JK Tyre × FMSCI.",
      oneNationVenue: "Kari Motor Speedway · Coimbatore",
      carsImage: "/images/journey/incrc/cars-lineup.png",
      carsAlt:
        "The multi-category grid — Formula 4, saloon, hatchback and touring cars in CTR × JK Tyre livery.",
      familyImage: "/images/journey/incrc/family.jpg",
      familyAlt:
        "Media, teams, marshals and officials standing arm-in-arm on the grid at sunset.",
      familyLead: "Entertainment isn't created by one organiser.",
      familyQuote: "It is powered by an entire motorsport family.",
      venues: [
        { number: "01", name: "Kari Motor Speedway", city: "Coimbatore" },
        { number: "02", name: "Bren Raceway", city: "Bengaluru" },
        { number: "03", name: "Madras International Circuit", city: "Chennai" },
      ],
      rounds: [
        { round: "01", dates: "11–13 September 2026", venue: "Kari Motor Speedway", city: "Coimbatore" },
        { round: "02", dates: "23–25 October 2026", venue: "Kari Motor Speedway", city: "Coimbatore" },
        { round: "03", dates: "13–15 November 2026", venue: "Bren Raceway", city: "Bengaluru" },
        { round: "04", dates: "11–13 December 2026", venue: "Madras International Circuit", city: "Chennai" },
      ],
      signingTitle: "A Landmark Partnership",
      signingText:
        "CTR, JK Tyre and FMSCI put pen to paper — bringing India's biggest multi-category national car racing championship to life.",
      signing: [
        { image: "/images/journey/incrc/signing-1.jpg", alt: "CTR, JK Tyre and FMSCI officials signing the championship agreement." },
        { image: "/images/journey/incrc/signing-2.jpg", alt: "CTR and JK Tyre representatives sealing the partnership with a handshake." },
        { image: "/images/journey/incrc/signing-3.jpg", alt: "The CTR × JK Tyre × FMSCI leadership with the signed championship agreement." },
      ],
      stats: [
        { value: "7", label: "Racing Categories" },
        { value: "4", label: "Championship Rounds" },
        { value: "3", label: "Iconic Circuits" },
        { value: "2026", label: "Inaugural Season" },
      ],
    },
  },

  // 05 — CTR PRO GRID ────────────────────────────────────────
  {
    id: "pro-grid",
    number: "05",
    variant: "highlights",
    theme: "dark",
    align: "right",
    title: "CTR Pro Grid",
    partners: [
      { name: "CTR", logo: EAGLE },
      { name: "Indian Racing League", logo: "/images/journey/logos/irl.png" },
      { name: "F4 Indian Championship", logo: "/images/sponsors/F4_logo.png" },
    ],
    lead: "Competing at the highest levels of Indian motorsport through Indian Racing League and Formula 4 platforms. Where performance meets pressure and talent is shaped for the global stage.",
    highlightsTitle: "Key Highlights",
    bullets: [
      "Presence in premier championships",
      "Consistent podium finishes and competitive edge",
      "High-intensity race exposure",
      "Clear pathway to elite racing",
      "Creating precision Engineering & Tech Opportunities for Aspiring Students.",
    ],
    footerStrip: "Competing at the Top. Building for the World.",
    image: "/images/journey/panels/pro-grid.jpg",
    imageAlt:
      "Side profile of a helmeted CTR driver over a city skyline at dusk, F4 car lower-right.",
  },

  // 06 — CTR KART REVOLUTION ─────────────────────────────────
  {
    id: "kart-revolution",
    number: "06",
    variant: "ladder",
    theme: "light",
    title: "CTR Kart Revolution",
    bullets: [
      "Designed to make motorsport mainstream through city-based teams, fan ecosystems and a clear driver progression system.",
      "From early talent identification to professional race exposure, CTR builds a complete ladder from grassroots to pro racing.",
      "Integrated with live race experience, digital broadcast and academic pathways through colleges.",
    ],
    ladder: ["SIM RACE", "TRAIN", "COMPETE", "PERFORM", "FORMULA 1"],
    quote: "India's first structured karting league by CTR.",
    footerStrip: "CTR Powers the Rise of a Racing Nation.",
    image: "/images/journey/panels/kart.jpg",
    imageAlt: "Silver F1-style CTR car accelerating along a rising track with motion streaks.",
  },

  // 07 — CTR ACADEMY ─────────────────────────────────────────
  {
    id: "academy",
    number: "07",
    variant: "academy",
    theme: "light",
    title: "CTR Academy",
    trainingTitle: "Training in",
    trainingList: [
      "Driving",
      "Engineering",
      "Race Operations",
      "Fitness",
      "Motorsport Management",
    ],
    collabTitle: "Collaboration with colleges and institutions for",
    collabList: [
      "Real racing exposure",
      "Internship opportunities",
      "Career development in motorsport",
    ],
    academyTiles: [
      { label: "Engineering", image: "/images/journey/academy/eng.jpg", alt: "Students assembling a race engine at the CTR Academy." },
      { label: "Driving", image: "/images/journey/academy/drive.jpg", alt: "CTR karting training session." },
      { label: "Race Operations", image: "/images/journey/academy/ops.jpg", alt: "Engineers at telemetry screens showing a circuit map." },
    ],
    quote: "Professional motorsport academy for aspiring racers and motorsport professionals.",
    footerStrip: "Learn. Train. Compete. Lead — The CTR Way.",
  },

  // 08 — CTR CLUB ────────────────────────────────────────────
  {
    id: "club",
    number: "08",
    variant: "club",
    theme: "light",
    align: "right",
    title: "CTR Club",
    bullets: [
      "A structured platform that brings real racing to everyone through safe, guided on-track experiences.",
      "With training, expert support and strict safety systems, CTR transforms enthusiasts into drivers.",
      "Scaling into a nationwide network of racing hubs — building the next generation of racers.",
      "Operating Racing + Elite Business Connection programs for the Corporates and MNCs.",
    ],
    footerStrip: "From First Drive to Real Racing — Only with CTR.",
    image: "/images/journey/panels/club.jpg",
    imageAlt: "CTR coach kneeling beside a seated kart driver on track, pointing ahead.",
  },

  // 09 — CTR ROADMAP ─────────────────────────────────────────
  {
    id: "roadmap",
    number: "09",
    variant: "roadmap",
    theme: "dark",
    title: "CTR Roadmap",
    stages: [
      {
        title: "CTR Academy",
        text: "Building future racers and motorsport professionals through industry-focused training and real racing exposure.",
      },
      {
        title: "CTR Karting League",
        text: "Scouting and developing young racing talent across India through competitive karting programs.",
      },
      {
        title: "CTR National Car Racing Championship",
        text: "Building future racers and motorsport professionals through industry-focused training and real racing exposure.",
      },
      {
        title: "International Motorsport Pathway",
        text: "Preparing talented racers for global motorsport opportunities with advanced training and international exposure.",
      },
    ],
    callouts: [
      {
        title: "CTR Ecosystem Flow",
        text: "Discover Talent → Educate & Train → Compete & Grow → Go Global → Make India Proud",
      },
      {
        title: "CTR Vision",
        text: "Creating India's Complete Motorsport Ecosystem — From Grassroots Karting to International Racing.",
      },
      {
        title: "CTR Dream",
        text: "To make the global racing podiums hear more of our Indian National Anthem.",
      },
    ],
  },

  // 10 — CTR UNIFIED ─────────────────────────────────────────
  {
    id: "unified",
    number: "10",
    variant: "unified",
    theme: "light",
    title: "CTR Unified",
    teamsCaption: "United under one racing movement.",
    teams: [
      { name: "Ossudu Accord Warriors", logo: "/images/journey/teams/ossudu-accord-warriors.png" },
      { name: "Accord Tamil Nadu Dragons", logo: "/images/journey/teams/accord-tn-dragons.png" },
      { name: "Chennai Super Warriors", logo: "/images/journey/teams/chennai-super-warriors.png" },
      { name: "Kashi Warriors", logo: "/images/journey/teams/kashi-warriors.png" },
      { name: "CTR F4 Championship", logo: "/images/journey/teams/ctr-f4-championship.png" },
    ],
  },

  // 11 — REGISTRATION ────────────────────────────────────────
  {
    id: "registration",
    number: "11",
    variant: "registration",
    theme: "dark",
    kicker: "2026 Season · Registration Open",
    title: "Race With CTR",
    lead: "Eight categories. National rounds on India's best circuits. Whether it's your first race or your next championship, there's a grid here for you.",
    ctas: [{ label: "Register Now", href: "/IndianNationalCarRacingChampionship/registration", kind: "gold" }],
  },

  // 12 — CTR FINAL LAP ───────────────────────────────────────
  {
    id: "final-lap",
    number: "12",
    variant: "finalLap",
    theme: "dark",
    align: "right",
    title: "CTR Final Lap",
    bullets: [
      "CTR is trying to create an honest pathway and a strong, unbreakable ladder to the true talents.",
      "With strong presence across championships, talent development and fan engagement, CTR is building a sustainable, future-ready ecosystem.",
      "CTR completely dedicated to the motorsport culture — starting from SIM Racing all the way to F1.",
    ],
    image: "/images/journey/panels/final-lap.jpg",
    imageAlt: "White CTR flag on a gold flagpole beside karts racing into a sunset.",
    closingHeadline: "Born to Race. Built to Win.",
    ctas: [
      { label: "Join the Movement", href: "#contact", kind: "gold" },
      { label: "Meet the Drivers", href: "https://chennaiturboriders.in/team", kind: "ghost-light", external: true },
    ],
  },
];

export const biography = {
  marquee:
    "From Passion to Purpose — From Track to Legacy · The Story of Chennai Turbo Riders",
  taglines: [
    "Engineering Speed. Delivering Dominance.",
    "From Passion to Purpose — From Track to Legacy.",
    "From Debut to Dominance.",
    "Competing at the Top. Building for the World.",
    "CTR Powers the Rise of a Racing Nation.",
    "Learn. Train. Compete. Lead — The CTR Way.",
    "From First Drive to Real Racing — Only with CTR.",
    "Born to Race. Built to Win.",
    "CTR is not organizing the future — CTR is building it.",
  ],
  stats: [
    { value: "2022", label: "Founded" },
    { value: "1st", label: "F4 Champion of India" },
    { value: "7", label: "Racing Categories" },
    { value: "5", label: "Associated Teams" },
  ],
  chapters,
  contact,
  socials,
};

export default biography;
