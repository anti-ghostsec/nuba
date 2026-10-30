/**
 * Fades an image in once it has loaded. Images that are already there (from
 * cache, or before the page became interactive) just show; without
 * JavaScript this never runs and images appear as usual.
 */
export function fadeIn(img: HTMLImageElement) {
	if (img.complete) return;
	img.style.opacity = '0';
	img.style.transition = 'opacity 0.35s ease';
	const show = () => (img.style.opacity = '1');
	img.addEventListener('load', show, { once: true });
	img.addEventListener('error', show, { once: true });
}
