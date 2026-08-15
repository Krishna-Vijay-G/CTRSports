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

export type AdminPagesRow = {
  admin_id: string;
  page_key: string;
};

export type AdminsRow = {
  id: string;
  username: string;
  password_hash: string;
  created_at: Date;
  role: string;
};

export type BannersRow = {
  page_key: string;
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
};

export type CalendarRoundsRow = {
  page_key: string;
  position: number;
  round: string;
  venue: string;
  city: string;
  date_from: string | null;
  date_to: string | null;
  dates: string;
  status: string;
  track_id: string | null;
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
  page_key: string;
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
  sort_order: number;
  created_at: Date;
  updated_at: Date;
  opens_at: Date | null;
  closes_at: Date | null;
  max_entries: number;
  sections: unknown;
};

export type PageSectionsRow = {
  page_key: string;
  section_id: string;
  position: number | null;
  visible: boolean;
  data: unknown;
  updated_at: Date;
};

export type PagesRow = {
  key: string;
  name: string;
  sort_order: number;
};

export type PartnersRow = {
  page_key: string;
  position: number;
  name: string;
  logo: string;
  href: string;
};

export type PostsRow = {
  page_key: string;
  post_id: string;
  position: number;
  image: string;
  category: string;
  date: string;
  title: string;
  excerpt: string;
  href: string;
};

export type SessionsRow = {
  token_hash: string;
  admin_id: string;
  expires_at: Date;
  created_at: Date;
};

export type SlugsRow = {
  entity_type: string;
  slug: string;
  entity_id: string;
  is_current: boolean;
  created_at: Date;
};

export type SportsRow = {
  id: string;
  title: string;
  text: string;
  details: string;
  logo_url: string;
  sort_order: number;
  is_visible: boolean;
  created_at: Date;
  updated_at: Date;
  photo_url: string;
  href: string;
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
  map_url: string;
  length: string;
  turns: string;
  note: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
  photo_url: string;
  svg_path: string;
  svg_view_box: string;
  former_names: string;
  owner: string;
  fia_grade: string;
  direction: string;
  opened: string;
  broke_ground: string;
  coordinates: string;
  capacity: string;
  major_events: string;
  lap_record_time: string;
  lap_record_year: string;
  races_held: number;
  slug: string;
};

/** Every table in the schema, by name. */
export type CtrTables = {
  admin_pages: AdminPagesRow;
  admins: AdminsRow;
  banners: BannersRow;
  calendar_rounds: CalendarRoundsRow;
  deck_pages: DeckPagesRow;
  decks: DecksRow;
  enquiries: EnquiriesRow;
  form_entries: FormEntriesRow;
  form_entry_answers: FormEntryAnswersRow;
  form_entry_files: FormEntryFilesRow;
  form_nonces: FormNoncesRow;
  forms: FormsRow;
  page_sections: PageSectionsRow;
  pages: PagesRow;
  partners: PartnersRow;
  posts: PostsRow;
  sessions: SessionsRow;
  slugs: SlugsRow;
  sports: SportsRow;
  track_links: TrackLinksRow;
  tracks: TracksRow;
};
