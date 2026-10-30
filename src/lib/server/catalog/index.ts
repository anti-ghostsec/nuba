import { env } from '$env/dynamic/private';
import { anilist } from './anilist';
import type { Catalog } from './types';

export { CatalogUnavailable } from './types';
export type { Catalog } from './types';

// Register new catalogs here and select one with NUBA_CATALOG.
const catalogs: Record<string, Catalog> = { anilist };

const name = env.NUBA_CATALOG || 'anilist';
if (!catalogs[name]) throw new Error(`Unknown NUBA_CATALOG "${name}". Available: ${Object.keys(catalogs).join(', ')}`);

export const catalog: Catalog = catalogs[name];
