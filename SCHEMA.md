# Mindbot Schema Design

Status: database migration and RPCs implemented and locally verified; remote
application, UI integration, and hybrid hosting remain pending. Updated November 7, 2026.

The initial migration defines the original four-table baseline. The follow-up
`supabase/migrations/202611070002_forum.sql` implements the database portion of
this specification. Local verification is not evidence of an applied remote schema.
See [operations](docs/operations.md) for current behavior and [TODO.txt](TODO.txt) for implementation order.

## Storage and Rendering

| Feature | Source of truth | Delivery |
| --- | --- | --- |
| Articles | Markdown in Git | HTML generated at build time |
| Companies and jobs | Structured modules in Git | HTML generated at build time |
| Article comments | Supabase | Loaded when comments are opened |
| Community topics and replies | Supabase | Public content rendered on the server |
| Login | Supabase Auth | Existing Google OAuth and browser PKCE sessions |

Use one Next.js application with SSG for articles/jobs and SSR for community.
The agreed future deployment is Cloudflare Workers through OpenNext. Implementing
it requires removing application-wide `output: "export"`; no configuration is
changed by this document. Article/job HTML must not query Supabase at request time.
Worker routing may participate in HTML requests; purely static Pages cost
assumptions do not automatically carry over.

OpenNext documents [SSG and SSR support](https://opennext.js.org/cloudflare) and a
[read-only static assets cache](https://opennext.js.org/cloudflare/caching) for
prerendered routes. Verify compatible package versions during implementation.
ISR, queues, and a database content cache are not required for this design.

## Flarum References and Adaptations

The local flarum/ checkout is the installation skeleton. These official 2.x
sources contain the actual models and extension migrations. Port the relationships
and behavior to PostgreSQL/Supabase; do not introduce a Flarum/PHP runtime.

| Official reference | Adopted behavior |
| --- | --- |
| [Discussion](https://github.com/flarum/framework/blob/2.x/framework/core/src/Discussion/Discussion.php) and [Post](https://github.com/flarum/framework/blob/2.x/framework/core/src/Post/Post.php) | Separate topic metadata from the original post and chronological replies |
| [UserState](https://github.com/flarum/framework/blob/2.x/framework/core/src/Discussion/UserState.php) | Per-user discussion read position |
| [Tags](https://github.com/flarum/framework/tree/2.x/extensions/tags/migrations) | Tags with a discussion/tag junction |
| [Likes](https://github.com/flarum/framework/tree/2.x/extensions/likes/migrations) | One like per user per post |
| [Flags](https://github.com/flarum/framework/tree/2.x/extensions/flags/migrations) | Reports and restricted moderation workflow |
| [Lock](https://github.com/flarum/framework/tree/2.x/extensions/lock/migrations) and [Sticky](https://github.com/flarum/framework/tree/2.x/extensions/sticky/migrations) | Moderator locking and pinning |
| [DiscussionPolicy](https://github.com/flarum/framework/blob/2.x/framework/core/src/Discussion/Access/DiscussionPolicy.php) | Restrict author removal after another member participates |

Keep Supabase Auth instead of copying password/token/session tables. Use fixed
roles rather than Flarum's extensible permissions engine. Store Markdown rather
than Flarum's formatted content or event-post types. Preserve applicable MIT
notices if actual source code is reused.

## Database Tables and Relationships

Use UUID keys and timestamptz timestamps. Identity, creation times, sequence
numbers, roles, and aggregates are database-controlled. Public schema placement
does not imply public access: all exposed tables need explicit grants and RLS.

| Table | Main fields and role |
| --- | --- |
| profiles | id referencing auth.users, display_name, created_at; public identity without email or roles |
| article_refs | Existing id, unique slug, title, published_at, is_published; static article navigation metadata |
| discussions | id, kind, unique nullable article_id, nullable author_id/title, created_at, updated_at, is_locked, is_pinned, hidden_at, hidden_by, deleted_at, next_post_number, post_count, last_post_id, last_activity_at |
| posts | id, discussion_id, number, nullable author_id, body, nullable reply_to_post_id, created_at, updated_at, hidden_at, hidden_by, deleted_at |
| tags | id, unique slug, name, optional description, position; operator-managed community tags |
| discussion_tag | Composite primary key (discussion_id, tag_id) |
| post_likes | Composite primary key (post_id, user_id), created_at |
| discussion_user | Composite primary key (discussion_id, user_id), last_read_post_number, last_read_at |
| flags | id, post_id, reporter_id, reason, optional details, status, created_at, resolved_by, resolved_at |
| private.user_access | user_id, role (member/moderator/admin), nullable suspended_until |
| private.write_rate_limits | user_id, last_post_at; shared creation cooldown state |

- Discussion kind is article or community. An article discussion requires an
  article_id and has no separate member owner/title. A community topic requires
  an initial member author and title, and has no article_id. Author references
  may later become null through account deletion.
- Each article has at most one discussion. Titles/URLs come from article_refs;
  article bodies and reporting sources stay in Git. Jobs have no discussions.
- Community post number 1 is the original body. All article posts are comments.
  (discussion_id, number) is unique. Allocate numbers under a discussion row lock
  using next_post_number; do not reuse deleted positions.
- reply_to_post_id optionally references an earlier post in the same discussion
  for quotation/navigation. Display remains chronological, without nested trees.
- post_count includes visible posts, including the community original. Latest
  post/activity exclude hidden/deleted posts, falling back to discussion creation
  time when no posts remain. Update aggregates on hide, restore, and deletion.
- Tags apply to community topics. Likes attach to posts; liking a topic means
  liking its original post. Read positions belong to their user, advance
  monotonically, and cannot exceed the discussion's available positions.
- Permit one report per user/post. Status is open, resolved, or dismissed.
  Report details and processing metadata are restricted, not publicly readable.
- Member deletion is soft deletion. Account deletion anonymizes authored content
  instead of cascading through other members' conversations.
- Index visible topic activity, discussion post number, author history, tag
  lookups, and open moderation reports.

### Static Interfaces

Retain existing article UUIDs, slugs, categories, front matter, and Markdown.
Article prose stays Korean; internal sources must not enter browser metadata or
DB registration. Company/job data uses structured modules in Git, not DB tables:

- Company: id, slug, name, websiteUrl, careersUrl.
- JobPosting: id, slug, companyId, title, summary, description, location, workMode,
  employmentType, sourceUrl, applyUrl, publishedAt, optional closesAt, draft.

Validate identifiers, company references, URLs, and timestamps before building.
Operators curate official career sources. Draft/closing status is evaluated at
build time; deadline and content changes require rebuilding and deployment.

## Permissions and Mutation Contracts

Visitors can read visible topics/posts and public profiles/tags. An article
thread also requires a published article reference. Post visibility requires a
visible parent topic. Own read state is private; reports are readable only by
reporters and staff. Likes and public counts must not reveal hidden content.

Members can create topics/replies, edit/delete their own content, like/report
visible posts, and advance their own read position. Authors cannot remove an
entire community topic after another member participates; moderators must handle
that removal. Original-post deletion follows this topic rule, not the ordinary
reply deletion path. Hiding an original through moderation hides the whole topic.

Moderators resolve reports and hide/restore, lock, and pin discussions. Admins
also assign roles and suspend accounts. Suspended accounts are read-only. Locked
topics reject ordinary member replies and content edits. Members cannot reverse
moderator hiding. Access roles never come from editable profiles/OAuth metadata.

Expose transactional RPCs for topic/reply creation, edits/deletions, setting a
like, advancing read state, reporting, and moderation. Create a topic and its
first post in one transaction. Derive actors from authentication and enforce
ownership, visibility, suspension, and locking inside the DB. Do not grant
clients direct mutation access to protected tables; profile edits are limited
to the member's display name. Privileged functions need fixed search paths,
narrow execution grants, and explicit caller checks. Publisher RPCs are service-only.

Apply one 30-second creation cooldown across article comments and community
topics/replies. Topic creation consumes it once, including its original post.
Cooldown state survives deletion. Sequence allocation and visible aggregate
updates happen within the write transaction.

## Publication, SSR, and Login

1. Validate and build static content before database writes.
2. Prepare article references and idempotently create discussions. New entries
   remain unpublished; existing published metadata remains intact.
3. Deploy the built application.
4. Activate the successful article manifest and navigation metadata; retire
   omitted articles without deleting history. Activation must be idempotent and
   retryable. Failed deployment leaves new entries unpublished. Report activation
   failures and retry: newly deployed articles may temporarily lack comments.

Preview builds never write to production. Provide explicit registration for a
development DB before testing comments; the current production-only script skips
local registration. Use publishing secrets only for publication, never normal
SSR or browser requests.

Community URLs use /community/[id]/ and stable #post-N anchors. Public SSR renders
the topic, first post page, and share metadata with anonymous permissions and the
publishable key. Perform request-time reads so moderation appears on subsequent
requests. Missing/hidden topics return 404. Page posts by number, 20 at a time.
Render Markdown with raw HTML disabled.

Keep browser PKCE and session persistence. Attach authenticated controls after
hydration; extend safe login return paths to community and news. Article comments
remain lazy. Do not introduce eager Supabase requests or shared server-session
dependencies on static routes. Handle structured database error code/message
fields instead of relying on instanceof Error alone.

## Migration and Verification

The owner installed Supabase CLI 3.0.0, initialized this project, and authenticated
and linked it. The initial migration remains unchanged; the follow-up implements
the forum upgrade. Inspect actual migration history and back up data before any
remote application. No remote schema was changed during implementation.

Preserve profiles and article/comment UUIDs, authors, bodies, timestamps, hidden
state, and cooldown state. Create article discussions and migrate comments to
posts with deterministic numbering ordered by created_at, id. Regenerate DB types
and switch client calls together before launch.

Required implementation acceptance cases:

- Empty and populated DB migration with data preservation and idempotent registration.
- First-post rollback, unique concurrent post numbers, and correct visible aggregates.
- Denials for anonymous writes, forged actors, role/counter changes, unauthorized
  edits, cross-topic reply targets, and suspension/lock bypasses.
- Cooldowns after deletion and under concurrent submissions.
- Hidden parents/replies absent from direct reads, aggregates, and share metadata.
- Duplicate likes/reports and backward/out-of-range read positions handled safely;
  another member's read state remains inaccessible.
- Build-time article/job HTML, no Supabase request before opening article comments,
  and SSR HTML for newly created topics without redeployment.
- Google login/cancellation, persistence, safe return paths, logout, outages, and
  usable cooldown/permission errors.
- Preview isolation, failed deployment, and successful activation retries.

V1 includes Google login, public member topics, chronological replies, tags,
likes, read state, reports, and pin/lock/hide moderation. Notifications,
subscriptions, DMs, uploads, employer submissions, and private spaces are deferred.

### Local Verification and Integration Handoff

Run `bun run test:db` to test the unchanged baseline plus empty/populated forum
migration, grants/RLS, publication, ownership, moderation, suspension, and concurrent
writes. The harness creates socket-only disposable PostgreSQL clusters with a
minimal Auth fixture. It never connects to the linked project. Verification used
Homebrew PostgreSQL 18.3; the initialized Supabase configuration targets 17. A full
Supabase/PostgREST/Auth integration run on that target is still required before
launch; these SQL tests do not verify Google OAuth or browser behavior.

`lib/forum-database.types.ts` is generated from the migrated local catalogs and
checked for drift by the database suite. Regenerate it with
`bun run test:db:update-types`. Keep the existing `lib/database.types.ts` and legacy
comment UI together until the UI transition; they still describe/use the baseline
schema. The follow-up removes the legacy comments table, so applying it alone does
not make the current UI compatible with the new database.

Public member RPCs are create_discussion, reply_to_discussion, edit_discussion,
edit_post, delete_discussion, delete_post, update_profile, set_post_like,
mark_discussion_read, and flag_post. Staff operations use moderate_discussion,
moderate_post, and resolve_flag; set_user_access and save_tag require an admin.
prepare_articles and activate_articles are executable only by service_role.
get_my_access returns only the caller's role and suspension state for UI controls.
Exact argument/return types are in the generated contract. New article references
are inactive until activation, including references preserved by the upgrade.

For a running local Supabase API with both migrations applied, use
`bun run register:articles:local --dry-run` to inspect the published-only navigation
manifest. Set SUPABASE_LOCAL_URL (default http://127.0.0.1:54321) and
SUPABASE_LOCAL_SECRET_KEY from that local instance, then run
`bun run register:articles:local` to prepare and activate it. The command rejects
remote URLs, CI execution, and HTTP redirects and does not fall back to production
credentials. Its HTTP tests use a loopback mock API; no actual Supabase API was
started in this implementation task. The production registration script remains
on the legacy path pending the publishing/deployment transition.

Implementation defaults: General, Questions, and Projects are seeded community
tags; a topic accepts up to five tags. Titles allow 1–200 characters, original
community bodies 1–20,000, and replies/article comments 1–5,000. Report reasons are
spam, harassment, off_topic, and other; optional detail is limited to 1,000
characters. Locked topics still allow likes, reports, and read-state updates.
Hidden/deleted posts keep their sequence positions. Moderator hiding of the
original post operates on the whole discussion; restoring the discussion restores
its visibility without restoring individually hidden replies. Admins cannot
change their own access through the RPC.
