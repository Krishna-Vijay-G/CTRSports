/**
 * Row types, generated from the database. Do not edit.
 *
 *   npm run db:types
 *
 * One type per table in the `ctr` schema, in the shape the Neon driver hands
 * back — which is not always the shape the domain types use. A `timestamptz`
 * arrives as a `Date` and every repo converts it at the boundary; a `jsonb`
 * column is `unknown` until something normalises it, which is the honest
 * answer for a column whose shape the database does not police.
 *
 * These describe a ROW. The domain types in src/lib describe what the
 * application means by one, and the two are different on purpose — a `Deck`
 * has `pages`, and no row does.
 */

export type AdminGrantsRow = {
  admin_id: string;
  site_id: string;
  module: string;
};

export type AdminsRow = {
  id: string;
  username: string;
  password_hash: string;
  role: string;
  created_at: Date;
};

export type ArticlesRow = {
  id: string;
  title: string;
  subtext: string;
  cover_image: string;
  body: unknown;
  status: string;
  published_at: string | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
  site_id: string;
};

export type BannersRow = {
  banner_id: string;
  position: number;
  template: string;
  image: string;
  fit: string;
  focus: string;
  overlay: string;
  title: string;
  subtitle: string;
  cta_label: string;
  cta_href: string;
  section_id: string;
};

export type DeckPagesRow = {
  deck_id: string;
  position: number;
  url: string;
  alt: string;
};

export type DecksRow = {
  id: string;
  name: string;
  status: string;
  blurb: string;
  show_heading: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
  site_id: string;
};

export type EnquiriesRow = {
  id: string;
  name: string;
  email: string;
  message: string;
  handled: boolean;
  ip: string;
  user_agent: string;
  created_at: Date;
};

export type EventsRow = {
  id: string;
  site_id: string;
  round: string;
  title: string;
  subtitle: string;
  venue: string;
  city: string;
  track_id: string | null;
  form_id: string | null;
  date_from: string | null;
  date_to: string | null;
  dates: string;
  badge: string;
  status: string;
  cover_image: string;
  body: unknown;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

export type FormEntriesRow = {
  id: string;
  form_id: string;
  ip: string;
  user_agent: string;
  created_at: Date;
};

export type FormEntryAnswersRow = {
  entry_id: string;
  field_id: string;
  idx: number;
  is_list: boolean;
  value_text: string;
  value_num: string | null;
  value_date: string | null;
};

export type FormEntryFilesRow = {
  entry_id: string;
  field_id: string;
  idx: number;
  s3_key: string;
  file_name: string;
  size_bytes: string;
};

export type FormNoncesRow = {
  nonce: string;
  expires_at: Date;
};

export type FormsRow = {
  id: string;
  name: string;
  status: string;
  blurb: string;
  intro_title: string;
  intro_body: string;
  submit_label: string;
  success_title: string;
  success_body: string;
  closed_note: string;
  notify_to: string;
  fields: unknown;
  sections: unknown;
  opens_at: Date | null;
  closes_at: Date | null;
  max_entries: number;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
  site_id: string;
};

export type PageSectionsRow = {
  type: string;
  position: number;
  visible: boolean;
  data: unknown;
  updated_at: Date;
  page_id: string;
  id: string;
};

export type PagesRow = {
  id: string;
  site_id: string;
  kind: string;
  slug: string;
  name: string;
  sort_order: number;
};

export type PartnersRow = {
  position: number;
  name: string;
  logo: string;
  href: string;
  section_id: string;
};

export type PostsRow = {
  post_id: string;
  position: number;
  image: string;
  category: string;
  date: string;
  title: string;
  excerpt: string;
  href: string;
  section_id: string;
};

export type SchemaMigrationsRow = {
  version: string;
  name: string;
  checksum: string;
  applied_at: Date;
};

export type SessionsRow = {
  token_hash: string;
  admin_id: string;
  expires_at: Date;
  created_at: Date;
};

export type SiteModulesRow = {
  site_id: string;
  module: string;
};

export type SitesRow = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  status: string;
  accent: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
};

export type SlugsRow = {
  entity_type: string;
  slug: string;
  entity_id: string;
  is_current: boolean;
  created_at: Date;
  site_id: string;
};

export type SportsRow = {
  id: string;
  title: string;
  text: string;
  details: string;
  logo_url: string;
  photo_url: string;
  href: string;
  sort_order: number;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
  site_id: string | null;
};

export type TrackLinksRow = {
  track_id: string;
  position: number;
  label: string;
  href: string;
};

export type TracksRow = {
  id: string;
  name: string;
  location: string;
  photo_url: string;
  map_url: string;
  svg_path: string;
  svg_view_box: string;
  length: string;
  turns: string;
  direction: string;
  opened: string;
  broke_ground: string;
  former_names: string;
  owner: string;
  fia_grade: string;
  coordinates: string;
  capacity: string;
  major_events: string;
  lap_record_time: string;
  lap_record_year: string;
  races_held: number;
  note: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
  slug: string;
  site_id: string;
};

/** Every table in the schema, by name. */
export type CtrTables = {
  admin_grants: AdminGrantsRow;
  admins: AdminsRow;
  articles: ArticlesRow;
  banners: BannersRow;
  deck_pages: DeckPagesRow;
  decks: DecksRow;
  enquiries: EnquiriesRow;
  events: EventsRow;
  form_entries: FormEntriesRow;
  form_entry_answers: FormEntryAnswersRow;
  form_entry_files: FormEntryFilesRow;
  form_nonces: FormNoncesRow;
  forms: FormsRow;
  page_sections: PageSectionsRow;
  pages: PagesRow;
  partners: PartnersRow;
  posts: PostsRow;
  schema_migrations: SchemaMigrationsRow;
  sessions: SessionsRow;
  site_modules: SiteModulesRow;
  sites: SitesRow;
  slugs: SlugsRow;
  sports: SportsRow;
  track_links: TrackLinksRow;
  tracks: TracksRow;
};
