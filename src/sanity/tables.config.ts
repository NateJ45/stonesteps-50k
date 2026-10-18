// Safe to edit by hand
// =============================================================================
// Table panes for long lists (PORTS.md card 117) - THIS SITE'S columns
// =============================================================================
// Each entry adds a "<title>" item to the desk (src/sanity/structure.ts) that
// opens a sortable table of one document type, with a status pill per row and
// an Open button. The normal list stays where it was; this is an extra view.
//
// To add one: name the type, write a GROQ projection that produces every
// column key (dereference with ->, flags with defined()), list the columns,
// and pick the default sort. src/lib/studio-table.test.ts fails if a column is
// missing from its projection or the sort key is not a column.
//
// Column kinds: 'text' (default), 'date' (formatted, sorts by time), 'bool'
// (Yes / No), 'list' (an array shown comma-separated).
// =============================================================================
import type { TableConfig } from '../lib/studio-table';

export const TABLES: TableConfig[] = [
  // Stone Steps (2026-10-18): the sponsors, to see at a glance who has a logo
  // and a link before the sponsor thank-you goes up.
  {
    id: 'sponsor-table',
    title: 'Sponsors as a table',
    type: 'sponsor',
    projection: 'name, url, "logo": defined(logo.asset)',
    columns: [
      { key: 'name', label: 'Sponsor' },
      { key: 'url', label: 'Link' },
      { key: 'logo', label: 'Logo', kind: 'bool' },
    ],
    defaultSort: { key: 'name', dir: 'asc' },
  },
  // Race notices, to see which are switched on and when each ends.
  {
    id: 'notice-table',
    title: 'Race notices as a table',
    type: 'announcement',
    projection: 'message, style, enabled, endDate',
    columns: [
      { key: 'message', label: 'Notice' },
      { key: 'style', label: 'Style' },
      { key: 'enabled', label: 'Switched on', kind: 'bool' },
      { key: 'endDate', label: 'Last day', kind: 'date' },
    ],
    defaultSort: { key: 'endDate', dir: 'desc' },
  },
];
