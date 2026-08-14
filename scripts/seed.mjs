/**
 * The starting rows for a database that has none.
 *
 *   npm run db:seed
 *
 * Data, not schema — which is why it is here and not in a migration. A migration
 * describes the shape every copy of this database must have; these are six
 * sports cards and three circuits that a NEW install starts with and that
 * production has had for months. Putting them in 0001 would mean re-inserting
 * them into every branch cut from production, and deleting one would mean it
 * came back on the next deploy.
 *
 * Each half only fires on an empty table, so this cannot resurrect a card
 * somebody deleted on purpose, and running it twice does nothing the second
 * time.
 *
 * It was `seedSports` and `seedTracks` in scripts/schema.mjs, which ran on every
 * `npm run migrate`. The four backfills that sat beside them are gone: two are
 * now statements in 0001, and the two that filled blanks from these lists —
 * `backfillSportPhotos` and `backfillTrackDetails` — existed only for rows
 * seeded before their columns did, and are verified applied against production.
 * The seeds below write every column, so a fresh install never needs them.
 */
import { neon } from "@neondatabase/serverless";

/** Kept in step with SEED_SPORTS in src/lib/sports.ts. */
const SEED_SPORTS = [
  {
    title: "Pickleball",
    text: "Chennai Super Warriors",
    details:
      "Explosive hand-speed, compact court strategy, and doubles chemistry define CTR's pickleball identity.",
    logo_url: "/images/sports/pickleball.webp",
    photo_url: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=72",
    href: "",
    sort_order: 10,
  },
  {
    title: "Volleyball",
    text: "Kasi Warriors",
    details:
      "Vertical athleticism and controlled transition play power our volleyball program across elite competitions.",
    logo_url: "/images/sports/volleyball.webp",
    photo_url: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=800&q=72",
    href: "",
    sort_order: 20,
  },
  {
    title: "Cricket",
    text: "Accord Warriors",
    details:
      "Structured batting depth, precision bowling plans, and relentless fielding standards anchor this unit.",
    logo_url: "/images/sports/cricket.webp",
    photo_url: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=72",
    href: "",
    sort_order: 30,
  },
  {
    title: "Field Hockey",
    text: "Accord Tamil Nadu Dragons",
    details:
      "Pace-driven pressing and disciplined circle execution make our hockey program sharp and competitive.",
    logo_url: "/images/sports/hockey.webp",
    photo_url: "https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?auto=format&fit=crop&w=800&q=72",
    href: "",
    sort_order: 40,
  },
  {
    title: "Formula 4 Racing",
    text: "CTR Racing Development",
    details:
      "From telemetry to racecraft, the F4 pathway develops next-generation circuit talent with measurable rigor.",
    logo_url: "/images/sports/formula-4.webp",
    photo_url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=72",
    href: "",
    sort_order: 50,
  },
  {
    title: "Indian National Car Racing Championship",
    text: "National Circuit Program",
    details:
      "A professional national ladder connecting karting graduates to full circuit competition under one unified banner.",
    logo_url: "/images/sports/national-racing.webp",
    photo_url: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=72",
    href: "/incrc",
    sort_order: 60,
  },
];

/** Kept in step with SEED_TRACKS in src/lib/tracks.ts. */
const SEED_TRACKS = [
  {
    name: "Kari Motor Speedway",
    location: "Coimbatore, Tamil Nadu",
    photo_url:
      "https://cdn-s3.autocarindia.com/legacy/cdni/ExtraImages/20200907014213_Kari-Motor-Speedway-upgrades-1.jpg",
    map_url: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Kari_Motor_Speedway_Layout.jpg",
    length: "2.10 km",
    turns: "10",
    direction: "Clockwise",
    opened: "2003",
    owner: "Kari Motor Speedway Pvt Ltd",
    fia_grade: "3",
    major_events: ["Indian Racing League", "MRF Formula 2000", "F4 India"].join("\n"),
    note: "The home of Indian motorsport — tight, technical and unforgiving.",
    sort_order: 10,
  },
  {
    name: "Bren Raceway",
    location: "Doddaballapura, Bengaluru",
    photo_url:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTJqHEDj58zIR2oJEUa-EON-z44C2RuwoFAFAj4l7_b8vKLRvhrz1zTHbkg&s=10",
    map_url: "",
    length: "4.10 km",
    turns: "14",
    direction: "Anti-clockwise",
    fia_grade: "2",
    note: "India's newest permanent circuit, fast and flowing throughout.",
    sort_order: 20,
  },
  {
    name: "Madras International Circuit",
    location: "Irungattukottai, Chennai",
    photo_url:
      "https://cdn-s3.autocarindia.com/legacy/cdni/ExtraImages/20240920010433_Madras_international_karting_arena.jpg",
    map_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Irungattukottai_Race_Track_map_--_Full_track.svg/960px-Irungattukottai_Race_Track_map_--_Full_track.svg.png",
    length: "3.71 km",
    turns: "12",
    direction: "Clockwise",
    opened: "1990",
    broke_ground: "1988",
    former_names: "Madras Motor Race Track; Irungattukottai Race Track",
    owner: "Madras Motor Sports Club",
    fia_grade: "2",
    coordinates: "13°0′9″N 79°59′9″E",
    links: [{ label: "Official site", href: "https://en.madrasmotorsports.com" }],
    major_events: [
      "MRF Formula 2000",
      "Indian Racing League",
      "F4 India",
      "F4 SEA",
      "Asia Road Racing Championship",
      "Asian F3",
    ].join("\n"),
    lap_record_time: "1:30.323",
    lap_record_year: "2020",
    note: "A long back straight into a hairpin — the season's decider.",
    sort_order: 30,
  },
];

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Make sure .env exists in the project root.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

/*
 * Schema-qualified, unlike the application. The app relies on the search_path
 * 0001 sets on the database, which is the right trade for a hundred queries; a
 * setup script that may be the first thing ever run against a database is better
 * off saying where it means.
 */
async function seedSports() {
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM ctr.sports`;
  if (count > 0) return 0;

  for (const sport of SEED_SPORTS) {
    await sql`
      INSERT INTO ctr.sports (title, text, details, logo_url, photo_url, href, sort_order)
      VALUES (${sport.title}, ${sport.text}, ${sport.details}, ${sport.logo_url},
              ${sport.photo_url}, ${sport.href}, ${sport.sort_order})
    `;
  }

  return SEED_SPORTS.length;
}

async function seedTracks() {
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM ctr.tracks`;
  if (count > 0) return 0;

  for (const track of SEED_TRACKS) {
    await sql`
      INSERT INTO ctr.tracks (
        name, location, photo_url, map_url, length, turns, direction, opened,
        broke_ground, former_names, owner, fia_grade, coordinates, capacity,
        links, major_events, lap_record_time, lap_record_year, note, sort_order
      )
      VALUES (
        ${track.name}, ${track.location}, ${track.photo_url ?? ""}, ${track.map_url ?? ""},
        ${track.length ?? ""}, ${track.turns ?? ""}, ${track.direction ?? ""},
        ${track.opened ?? ""}, ${track.broke_ground ?? ""}, ${track.former_names ?? ""},
        ${track.owner ?? ""}, ${track.fia_grade ?? ""}, ${track.coordinates ?? ""},
        ${track.capacity ?? ""}, ${JSON.stringify(track.links ?? [])}::jsonb,
        ${track.major_events ?? ""},
        ${track.lap_record_time ?? ""}, ${track.lap_record_year ?? ""},
        ${track.note ?? ""}, ${track.sort_order}
      )
    `;
  }

  return SEED_TRACKS.length;
}

try {
  const sports = await seedSports();
  console.log(sports ? `Seeded ${sports} sports.` : "ctr.sports already has rows — nothing seeded.");

  const tracks = await seedTracks();
  console.log(tracks ? `Seeded ${tracks} circuits.` : "ctr.tracks already has rows — nothing seeded.");
} catch (error) {
  if (error.message.includes("does not exist")) {
    console.error("The schema is not there yet. Run npm run db:migrate first.");
    process.exit(1);
  }

  console.error("Failed:", error.message);
  process.exit(1);
}
