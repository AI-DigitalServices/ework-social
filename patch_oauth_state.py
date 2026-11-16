import pathlib
import sys

svc = pathlib.Path("apps/api/src/social/social.service.ts")
util = pathlib.Path("apps/api/src/social/oauth-state.util.ts")

if not svc.exists():
    sys.exit("social.service.ts not found - run this from the repo root. No changes made.")
if not util.exists():
    sys.exit("oauth-state.util.ts not found - create it first. No changes made.")

text = svc.read_text(encoding="utf-8")
original = text

if "oauth-state.util" in text:
    sys.exit("social.service.ts already references oauth-state.util - aborting, no changes made.")

SIGN_OLD = "const state = Buffer.from(JSON.stringify({ workspaceId, userId })).toString('base64');"
VERIFY_OLD = "const decoded = JSON.parse(Buffer.from(state, 'base64').toString());"

n_sign, n_verify = text.count(SIGN_OLD), text.count(VERIFY_OLD)
if n_sign != 6 or n_verify != 6:
    sys.exit(f"Expected 6 sign and 6 verify sites, found {n_sign} / {n_verify} - aborting, no changes made.")

# Sign/verify sites occur in matching pairs, in file order:
# facebook(+instagram), linkedin, linkedin-org, youtube, tiktok, threads.
PROVIDERS = ["facebook", "linkedin", "linkedin-org", "youtube", "tiktok", "threads"]
for p in PROVIDERS:
    text = text.replace(SIGN_OLD, f"const state = signOAuthState('{p}', workspaceId, userId);", 1)
    text = text.replace(VERIFY_OLD, f"const decoded = verifyOAuthState('{p}', state);", 1)

IMPORT = "import { signOAuthState, verifyOAuthState } from './oauth-state.util';\n"
marker = "\n@Injectable()"
if text.count(marker) != 1:
    sys.exit("Could not find a unique @Injectable() anchor for the import - aborting, no changes made.")
text = text.replace(marker, "\n" + IMPORT + marker, 1)

if text == original:
    sys.exit("No changes were made - aborting.")

svc.write_text(text, encoding="utf-8")
print("Patched social.service.ts: 6 state-sign sites and 6 state-verify sites now use signed, expiring state.")
