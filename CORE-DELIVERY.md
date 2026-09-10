# Core delivery — live 2026-09-09

Active runtime: `/Users/inem/.local/share/tap-core-linkedin/checkout`.
Profile: `/Users/inem/.local/share/tap-core-linkedin/profile`.
Core revision b7c3cdd6d6a135f1e6aee440014b6f9c6e01fe1e; system proxy 18999.
The original workspace profile is stopped and retained, not the active profile.
Moved out of Documents after launchd getcwd permission errors.

Installed linkedin.copy-links 0.4.2 and linkedin.archive 0.1.0.
Browser feed loads the Core content-addressed asset, no legacy marker. Copy
verified and empty clipboard restored. Save/load-more were not repeated this run.
Opening reactions generated live Core records and archive observations/entities.
Managed components include Hub under this Core configuration; this combined
profile is not a hubless claim. Doctor healthy, one capture drop observed,
zero write errors. No claim of complete reaction/comment coverage.

Existing trusted CA copied privately; original unchanged. No new trust needed.
Legacy LinkedIn addon renamed _linkedin-copy-links.py.disabled; running legacy
process was not restarted and may retain its loaded module until its next start.
System traffic is on Core, so it does not provide current browser UI delivery.

Other legacy functions are not yet migrated. Global ~/.local/bin/tap still
points at legacy: operate this profile with its explicit checkout/tap path.
To return to legacy routing: first use Core `off` with this profile, then old
`/Users/inem/Code/tap/tap on`. Never arm both simultaneously. Restoring legacy
LinkedIn delivery additionally requires restoring the disabled addon and reload.

Evidence: ../../docs/linkedin-core-live-2026-09-09.json.
