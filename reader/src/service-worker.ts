/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Precache the whole app (bundle + static assets + prerendered pages) so the
// reader works fully offline once installed on the home screen.

const sw = self as unknown as ServiceWorkerGlobalScope;

import { build, files, prerendered, version } from '$service-worker';

const CACHE = `canzoniere-reader-${version}`;
const ASSETS = [...build, ...files, ...prerendered];

// Hashed build output and static files are immutable: their URL changes when
// their content changes, so they can be served straight from cache forever.
// Everything else (navigations, prerendered HTML) is served network-first, so
// after a deploy the page always loads with the asset hashes of the version
// that is actually live, instead of a stale HTML pointing at evicted files.
const IMMUTABLE = new Set([...build, ...files]);

sw.addEventListener('install', (event) => {
	// No skipWaiting here: the new worker stays waiting until the page offers
	// the update and the user accepts it (message below), so the app never
	// changes version silently mid-use.
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

sw.addEventListener('message', (event) => {
	if (event.data === 'skip-waiting') sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	if (url.origin !== location.origin) return; // let the browser handle cross-origin

	// Immutable assets: cache-first (they are precached; the network is only a
	// fallback for anything somehow missing).
	if (IMMUTABLE.has(url.pathname)) {
		event.respondWith(
			(async () => {
				const cache = await caches.open(CACHE);
				const cached = await cache.match(event.request);
				return cached ?? fetch(event.request);
			})()
		);
		return;
	}

	// Navigations and other pages: network-first, so a fresh deploy is picked up
	// immediately; fall back to the cache (and to the app shell) when offline.
	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			try {
				const response = await fetch(event.request);
				if (response.ok) cache.put(event.request, response.clone());
				return response;
			} catch (err) {
				const cached = await cache.match(event.request);
				if (cached) return cached;
				if (event.request.mode === 'navigate') {
					const shell = await cache.match(`${sw.registration.scope}`);
					if (shell) return shell;
				}
				throw err;
			}
		})()
	);
});
