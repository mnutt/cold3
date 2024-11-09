
import { visualizer } from 'rollup-plugin-visualizer'//npm run build generates stats.html, but npm run local does not

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	site: {
		url: 'https://cold3.cc',//added this for nuxt og image, which uses it to set absolute urls
		name: 'cold3.cc'
	},
	compatibilityDate: '2024-04-03',
	nitro: {
		preset: 'cloudflare-pages',
		esbuild: {
			options: {
				target: 'esnext'//added to solve error on npm run build about es2019 not including bigint literals
			}
		},
	},
	modules: [
		'nuxt-og-image',
		'nitro-cloudflare-dev',
	],
	ogImage: {
		defaults: {
			renderer: 'satori',//default, not really needed
			cacheMaxAgeSeconds: 2*60//2 minutes in seconds
		},
		runtimeCacheStorage: {
			driver: 'cloudflare-kv-binding',
			binding: 'OG_IMAGE_CACHE'
		}
	},
	devtools: {
		enabled: true
	},
	runtimeConfig: {//nuxt promises these will be available on the server side, and never exposed to a client
		ACCESS_KEY_SECRET: process.env.ACCESS_KEY_SECRET
	},
	build: {
		sourcemap: true//added for visualizer
	},
	vite: {
		plugins: [
			visualizer({
				filename: './stats.html',
				template: 'treemap',//try out "sunburst", "treemap", "network", "raw-data", or "list"
				brotliSize: true
			})
		]
	}
})
