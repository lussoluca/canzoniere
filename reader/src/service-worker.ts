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

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
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

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			const cached = await cache.match(event.request);
			if (cached) return cached;

			try {
				const response = await fetch(event.request);
				if (response.ok && new URL(event.request.url).origin === location.origin) {
					cache.put(event.request, response.clone());
				}
				return response;
			} catch (err) {
				// Offline and not cached: for navigations fall back to the app shell.
				if (event.request.mode === 'navigate') {
					const shell = await cache.match(`${sw.registration.scope}`);
					if (shell) return shell;
				}
				throw err;
			}
		})()
	);
});
