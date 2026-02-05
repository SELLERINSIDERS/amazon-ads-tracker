# Phase 5 Research: Campaign & Keyword Management

## Overview

Phase 5 implements campaign and keyword management features with inline editing.

## Requirements Analysis

### Inline Editing (CAMP-04)
- Edit budget, status directly in table
- Changes saved locally first, synced to Amazon later
- Optimistic UI updates

### Drill-down Navigation (CAMP-05)
- Campaign → Ad Groups → Keywords
- Consistent metric columns at each level
- Breadcrumb navigation

### Campaign Creation (CAMP-06)
- New SP campaign form
- Fields: name, ASIN, budget, targeting type, default bid
- Calls Amazon API to create campaign

### Keywords Page (KWRD-01, KWRD-06, KWRD-07)
- View all keywords with metrics
- Filter by campaign, ad group, match type
- Sortable columns

### Search Terms (KWRD-02, KWRD-03)
- Search term report display
- Suggested actions (requires rules engine - Phase 8)
- For now: display search terms, actions UI placeholder

### Bulk Actions (KWRD-04, KWRD-05)
- Multi-select keywords
- Actions: change status, adjust bid
- Add negative keywords

## Implementation Approach

Since Amazon API writes require live credentials, we'll:
1. Build complete UI for all features
2. Store pending changes locally (optimistic updates)
3. API write functions will be functional but may fail without credentials

## Plan Breakdown

### Plan 05-01: Campaign Detail & Drill-down
- Campaign detail page at /campaigns/[id]
- Ad groups table within campaign
- Keyword drill-down from ad group

### Plan 05-02: Keywords Page
- /keywords route
- Full keyword table with filters
- Match type, campaign, ad group filters

### Plan 05-03: Inline Editing
- Edit buttons/cells in tables
- Status toggle, budget edit
- Save action (local + API attempt)

---
*Research completed: 2026-02-05*
