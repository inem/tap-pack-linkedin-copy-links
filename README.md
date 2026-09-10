# LinkedIn Copy links — v0.4.14

One-click post links and native Save/Unsave using the feed's native icon-action presentation. The action
sits beside the post menu, inherits its live presentation classes, and provides
keyboard activation and completion/error feedback without changing button size.
No Hub, reader, WS or separate account setup is required.

## Save shortcut

A bookmark button invokes LinkedIn's own Save/Unsave menu action. It opens only
that post's verified native menu, privately invokes the existing control once,
and re-reads the native state before showing success. An immediately stale menu
is retried as a read; the write is never retried. Unknown state is labelled
`Save / unsave post` until observed; known saved state uses a filled bookmark.

The implementation uses the observed SDUI portal ID and bookmark icon identifiers,
not translated labels or copied credentials. Another open menu blocks the shortcut.
Unavailable/ambiguous controls, replacement, cancellation and missing confirmation
fail without guessing. Failure stays visible until retry. A timeout means the
result is unconfirmed, not proof that the save did not happen. Native scroll
containers are restored after the hidden menu operation.

`adapters/linkedin-save.js` owns this site operation; `linkedin-save-ui.js`
binds its state to the same action slots as Copy. SDK mount disposal aborts the
provided signal so delayed UI work cannot start an effect after removal.

## Reusable parts

- `adapters/linkedin.js`: observed post identity and link material.
- `adapters/linkedin-ui.js`: post action slot and native presentation. Accepts the
  action label/icon/messages, so it is not a LinkedIn-specific copy operation.
- `page.js`: composes that slot with SDK `copy_link` and `mount_action`.
- SDK `src/ui.js`: owned control lifecycle, state rendering and cleanup. The
  articles example uses the same machinery with a text control.

The general development workflow and current executable API are in the SDK's
`docs/ui.md`, linked from the updated `tap-pack-dev` site-adapter subworkflow.
YouTube's existing UI reference was inspected but not migrated in this change.

## Build and check

Set `CORE` and `SDK` to local checkouts and use a fresh output directory:

```sh
python3 "$SDK/sdk.py" --core "$CORE" build . --out "$OUT" --bun "$(command -v bun)"
python3 "$SDK/sdk.py" --core "$CORE" check "$OUT/linkedin.copy-links-0.4.14.tap-pack"
```

Copy `tests/fixture.html` into the build directory, serve it locally and open it.
The fixture executes the built `pack/page.js`; all post material is synthetic.
It includes delayed completion, identity replacement, a neighboring action,
clipboard refusal, hydration removal, reinjection and cleanup controls.

## Verification and coverage

2026-09-09: live LinkedIn mouse/Enter copying and keyboard focus verified in the
in-app browser. The action and native peer both measure 32×32 and share presentation
classes, with no copied menu state or component identity. Light feed layout was
visually inspected. Fixture checks cover replacement during an in-flight operation,
neighbor insertion without remounting, exact copied URL, refusal, reinjection,
unknown identities, hydration removal and cleanup. Detailed evidence is in the
SDK `evidence/ui-libraries.json` and workspace `artifacts/linkedin-actions-v0.3.0-verified/`.

Known limits: unrecognized identity variants remain unavailable.
Pagination must occur while this pack is active; activating midway through a feed
cannot reconstruct responses that already passed. Reload once after installation. Other LinkedIn layouts
and dark mode are not live-verified. Earlier native-link destination comparison
was performed on v0.1.1; the identity/URL resolver is unchanged in v0.3.0.

## Delivery

Current delivery is through TAP Core's installed `.tap-pack` artifact. The
`tools/legacy-delivery.py` file is retained only as historical compatibility
material and is not required by the current pack.

Save-specific evidence: `artifacts/linkedin-actions-v0.3.0-verified/save-acceptance.json`
in the author workspace. `tests/save-fixture.html` exercises native-menu behavior,
including a stale read after one write, refusal and cancellation.

## Menu deduplication (0.3.1)

For supported cards with direct actions, native Save/Unsave and Copy link menu
entries are hidden. Their DOM and handlers remain available to the native Save
operation. Other menu entries and unsupported cards are unchanged. Disposing the
pack restores the original display styles.

Verified with the built artifact: fixture menu filtering, one-write Save, cleanup
and unsupported-card fallback; live LinkedIn menu filtering and Save → Unsave
confirmation, restoring the test post to unsaved. Evidence in the author workspace:
`artifacts/linkedin-actions-v0.3.1/menu-acceptance.json`.

## Pagination (0.4.0)

`linkedin-stream.js` observes same-origin `/flagship-web/rsc-action/actions/pagination`
responses already requested by the page. It reads a clone, leaves the original
response untouched and makes no extra requests. The raw RSC rows use the existing
post/menu identity resolver; Copy and Save share the resulting index. New material
refreshes both action mounts, including when the DOM arrived before the material.

Observation is limited to two concurrent responses, 16 MiB decoded bytes each and
15 seconds. Over-limit, failed and cancelled observations leave native controls
available. At most 5,000 card bindings are retained; response bodies are discarded.
Disposal cancels observer branches and restores fetch if this wrapper still owns it.

Evidence: synthetic streamed response parsing, response preservation, oversized
body rejection, cancellation and installed fixture Copy/Save after Load more;
live LinkedIn pagination acceptance is recorded in the author workspace under
`artifacts/linkedin-actions-v0.4.0/pagination-acceptance.json`.

0.4.1 hides Today’s puzzles and its empty wrapper using the observed games component key. The scoped style covers remounts and is removed on pack disposal.

0.4.2 also hides the sidebar advertisement identified by `MainFeedDesktopNav_feed_ad`, including its two layout wrappers. The neighboring footer and feed posts remain visible.

Company-page adapter (0.4.7): supports observed Ember article/data-urn cards and
native Artdeco Save menu, in addition to SDUI feed cards. Later Core CSP delivery
made this path available on live company pages.

Versions through 0.4.14 add promoted-card recognition and preserve the right-rail
layout while hiding its native contents, leaving a stable slot for later local UI.
All hiding operations observe remounts and restore native content on disposal.
