<script lang="ts">
	import { usePrefs } from '$lib/context';
	import { img, titleOf } from '$lib/format';
	import { SITE } from '$lib/site';
	import type { Release } from '$lib/types';

	let { items, now }: { items: Release[]; now: number } = $props();

	const prefs = usePrefs();

	// Group into the viewer's next seven calendar days. The timezone comes from
	// the browser, so this re-renders in local time as soon as JS loads.
	const days = $derived.by(() => {
		const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: prefs.tz, year: 'numeric', month: '2-digit', day: '2-digit' });
		const weekday = new Intl.DateTimeFormat('en', { timeZone: prefs.tz, weekday: 'short' });
		const time = new Intl.DateTimeFormat('en', { timeZone: prefs.tz, hour: '2-digit', minute: '2-digit' });

		const result = Array.from({ length: 7 }, (_, i) => {
			const date = new Date((now + i * 86400) * 1000);
			return {
				key: dayKey.format(date),
				label: i === 0 ? 'Today' : weekday.format(date),
				entries: [] as (Release & { time: string; aired: boolean })[]
			};
		});
		const byKey = new Map(result.map((d) => [d.key, d]));

		for (const item of items) {
			const date = new Date(item.at * 1000);
			byKey.get(dayKey.format(date))?.entries.push({ ...item, time: time.format(date), aired: item.at <= now });
		}
		return result;
	});
</script>

<!-- Radio tabs: switching days needs no JavaScript and no request. -->
<section class="schedule" id="schedule">
	<h2 class="section-title">Schedule</h2>
	{#each days as day, i (day.key)}
		<input type="radio" name="schedule-day" id="day-{i}" class="sr-only" checked={i === 0} />
	{/each}
	<div class="tabs" role="presentation">
		{#each days as day, i (day.key)}
			<label for="day-{i}" class="tab tab-{i}">{day.label}</label>
		{/each}
	</div>
	<div class="panels">
		{#each days as day, i (day.key)}
			<ul class="panel-list panel-{i}">
				{#each day.entries as entry (entry.id)}
					<li>
						<a href="/title/{entry.item.id}" class="entry">
							<time datetime={new Date(entry.at * 1000).toISOString()}>{entry.time}</time>
							<img
								src={img(entry.item.cover)}
								alt=""
								loading="lazy"
								width="36"
								height="50"
								style:background={entry.item.color ?? 'var(--surface-2)'}
							/>
							<span class="info">
								<span class="name">{titleOf(entry.item, prefs.titleLang)}</span>
								<span class="ep">{SITE.unit.one} {entry.unit}</span>
							</span>
							<span class="status" class:upcoming={!entry.aired}>{entry.aired ? 'Aired' : 'Upcoming'}</span>
						</a>
					</li>
				{:else}
					<li class="empty">Nothing scheduled.</li>
				{/each}
			</ul>
		{/each}
	</div>
</section>

<style>
	.schedule {
		position: relative;
		display: grid;
		gap: 16px;
		align-content: start;
		scroll-margin-top: calc(var(--header-h) + 16px);
	}
	.tabs {
		display: flex;
		gap: 4px;
		padding: 4px;
		border-radius: var(--radius);
		background: var(--surface);
		border: 1px solid var(--border);
		overflow-x: auto;
		scrollbar-width: none;
	}
	.tab {
		flex: 1;
		min-width: 56px;
		padding: 7px 10px;
		border-radius: 7px;
		text-align: center;
		font-size: 0.86rem;
		color: var(--muted);
		cursor: pointer;
		white-space: nowrap;
		transition:
			background 0.15s,
			color 0.15s;
	}
	.tab:hover {
		color: var(--text);
	}
	.panel-list {
		display: none;
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 520px;
		overflow-y: auto;
		gap: 8px;
		scrollbar-width: thin;
	}
	/* One rule per day: the checked radio picks the tab style and the visible list. */
	#day-0:checked ~ .tabs .tab-0,
	#day-1:checked ~ .tabs .tab-1,
	#day-2:checked ~ .tabs .tab-2,
	#day-3:checked ~ .tabs .tab-3,
	#day-4:checked ~ .tabs .tab-4,
	#day-5:checked ~ .tabs .tab-5,
	#day-6:checked ~ .tabs .tab-6 {
		background: var(--surface-2);
		color: var(--text);
		box-shadow: inset 0 0 0 1px var(--border);
	}
	#day-0:checked ~ .panels .panel-0,
	#day-1:checked ~ .panels .panel-1,
	#day-2:checked ~ .panels .panel-2,
	#day-3:checked ~ .panels .panel-3,
	#day-4:checked ~ .panels .panel-4,
	#day-5:checked ~ .panels .panel-5,
	#day-6:checked ~ .panels .panel-6 {
		display: grid;
	}
	#day-0:focus-visible ~ .tabs .tab-0,
	#day-1:focus-visible ~ .tabs .tab-1,
	#day-2:focus-visible ~ .tabs .tab-2,
	#day-3:focus-visible ~ .tabs .tab-3,
	#day-4:focus-visible ~ .tabs .tab-4,
	#day-5:focus-visible ~ .tabs .tab-5,
	#day-6:focus-visible ~ .tabs .tab-6 {
		outline: 2px solid var(--accent);
	}
	.entry {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 10px 14px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--surface);
		transition: border-color 0.15s;
	}
	.entry:hover {
		border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
	}
	time {
		width: 64px;
		flex-shrink: 0;
		font-size: 0.85rem;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.entry img {
		width: 36px;
		height: 50px;
		flex-shrink: 0;
		border-radius: 6px;
		object-fit: cover;
	}
	.info {
		flex: 1;
		min-width: 0;
		display: grid;
	}
	.name {
		font-size: 0.92rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.ep {
		font-size: 0.78rem;
		color: var(--muted);
	}
	.status {
		font-size: 0.82rem;
		color: var(--faint);
	}
	.status.upcoming {
		color: var(--accent);
	}
	.empty {
		padding: 24px;
		text-align: center;
		color: var(--muted);
	}
</style>
