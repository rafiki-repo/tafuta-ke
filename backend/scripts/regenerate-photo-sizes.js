/**
 * regenerate-photo-sizes.js
 *
 * CLI wrapper around media.regeneratePhotoSizes(). Backfills WebP outputs for
 * every already-uploaded photo after a size is added (or changed) in
 * app-config.jfx. Re-renders each output from the original source file using
 * the transform stored in that image's .jfx spec, so results are identical
 * to what a fresh upload would produce.
 *
 * The same operation is also exposed to super admins in the app at
 * Admin > System Config > Maintenance (POST /api/admin/system/regenerate-photo-sizes).
 *
 * Run from the backend directory:
 *
 *   npm run regenerate-photo-sizes
 *   npm run regenerate-photo-sizes -- --tag=kanda-granite
 *   npm run regenerate-photo-sizes -- --type=logo
 *   npm run regenerate-photo-sizes -- --force
 *
 * Flags:
 *   --tag=<business_tag>   only process one business's media folder
 *   --type=<image_type>    only process one image type (e.g. logo, banner)
 *   --force                regenerate every size, even ones that already exist
 */

import { regeneratePhotoSizes } from '../src/services/media.js';

const args = process.argv.slice(2);
const flag = (name) => {
  const prefix = `--${name}=`;
  const hit = args.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
};

async function main() {
  const summary = await regeneratePhotoSizes({
    businessTag: flag('tag') || undefined,
    imageType: flag('type') || undefined,
    force: args.includes('--force'),
  });

  for (const err of summary.errors) console.warn(`  [warn] ${err}`);

  console.log(
    `\nDone. Generated ${summary.generated}, skipped ${summary.skipped} (already existed), failed ${summary.failed}.\n`
  );
}

main().catch((err) => {
  console.error('\nUnexpected error:', err.message, '\n');
  process.exit(1);
});
