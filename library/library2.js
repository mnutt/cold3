
//library2 is for library functions more specific to this project than general-purpose
//grow them here, then probably refactor them out into named files in this library folder
//actually don't do this, it's library1.js and the named files

import { noop, test, ok, log, composeLog, Now, end, subtleHash, Data } from './library0.js'
import { Tag, tagLength, checkTag } from './library1.js'












//  _                                       _              
// | |__  _ __ _____      _____  ___ _ __  | |_ __ _  __ _ 
// | '_ \| '__/ _ \ \ /\ / / __|/ _ \ '__| | __/ _` |/ _` |
// | |_) | | | (_) \ V  V /\__ \  __/ |    | || (_| | (_| |
// |_.__/|_|  \___/ \_/\_/ |___/\___|_|     \__\__,_|\__, |
//                                                   |___/ 

function removeNumerals(s) {
	return s.replace(/\d/g, '')
}
test(() => {
	ok(removeNumerals('hello') == 'hello')
	ok(removeNumerals('h3ll0') == 'hll')
})

function getBrowserFingerprint() {
	let agent = navigator.userAgent

	let renderer = '', vendor = ''
	let c = document.createElement('canvas')
	let g = c.getContext('webgl') || c.getContext('experimental-webgl')
	if (g) {
		let d = g.getExtension('WEBGL_debug_renderer_info')
		if (d) {
			renderer = g.getParameter(d.UNMASKED_RENDERER_WEBGL)
			vendor = g.getParameter(d.UNMASKED_VENDOR_WEBGL)
		}
	}
	//what about screen resolution? multiple desktop monitors, and the user turning their phone, make this not a good choice

	return removeNumerals(`agent:${agent};renderer:${renderer};vendor:${vendor};`)//remove numerals so frequent automatic browser updates don't change the fingerprint
}

export function getBrowserTag() {
	let s = end(getBrowserTagWithPrefix(), tagLength)
	checkTag(s)
	return s
}
function getBrowserTagWithPrefix() {//create set and get if not found
	const browserTagKey = 'current_session_password'
	const browserTagValuePrefix = 'account_access_code_DO_NOT_SHARE_'//named these to discourage sharing, even if a n00b user is being coached by a hacker on reddit or discord to dig around the inspector

	let value = localStorage.getItem(browserTagKey)
	if (!value) {
		value = browserTagValuePrefix + Tag()
		localStorage.setItem(browserTagKey, value)
	}
	return value
}

export function getBrowserFingerprintAndTag() {
	return `${getBrowserFingerprint()}tag:${getBrowserTagWithPrefix()};`
}

async function timeBrowserHash() {
	let t = Now()
	let h = (await subtleHash(Data({text: getBrowserFingerprintAndTag()}))).base32()
	log(`hashed to ${h} in ${Now() - t}ms`)//ok, this takes 8ms, unfortunately
}
/*
~ security note ~

good security design is always a balance between security and usability

the goal is to keep the user signed in without expiration
and to keep that as secure as possible

this is not the current experience of the web, a short timeout, any IP address change, or any use from another device leads to automatic sign-out
and the poor user experience harms security, as users choose bad passwords, or discontinue using the site altogether

the only place i've noticed signin without expiration is facebook
i use facebook less than once a year, but whenever i go to facebook.com, im still signed in
meta likely has metrics that link signing out a user with losing that user

essentially, a browser is identified by a tag
and if a signed-in browser reports the same tag to the server, it's still signed in
but there are two security enhancements:

(1) scary naming
in local storage, the key and name look like this:
current_session_password: account_access_code_DO_NOT_SHARE_hi1y5ICjnEQLVDKtawm0C
imagine a n00b user is on a discord server or subreddit dedicated to power users of an instance of the platform, where a sophisticated attacker coaches users into compromising their accounts
warning language to the n00b may give them pause

(2) browser tag hashed, not sent
the browser tag is never sent to the server
the hash is never saved to the disk
if the user's disk or system is compromised, a rudimentary scanner can recover the browser tag, but must compute the hash

(3) hash is of tag and fingerprint
rather than hashing the tag alone, details specific to the browser are included in the data hashed
these details are designed to be specific to the user's device, but unlikely to change
*/

noop(async () => {
	log(getBrowserFingerprintAndTag())
	await timeBrowserHash()
})
/*
examples:

agent:Mozilla/. (Windows NT .; Win; x) AppleWebKit/. (KHTML, like Gecko) Chrome/... Safari/.;renderer:ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E92) Direct3D11 vs_5_0 ps_5_0, D3D11);vendor:Google Inc. (Intel);tag:account_access_code_DO_NOT_SHARE_hi1y5ICjnEQLVDKtawm0C;

ZPTJJJP2OV5WNFEMXVLMI3IV3C6ZVQRVXNM4UXMWPQCZDDT4KP6Q

7ms

concerns with fingerprinting and identifying the session:

pinia, shouldn't browserTag live there?

how long does this take? (7-10ms on your big windows desktop, measure on your phone)
you'll include it in every single API call, as it identifies who the caller at least says they are
you don't want it to slow down the very first page laod for the user
you can cache it for the whole session--in a global? in pinia?
you can't save it to local storage! or let pinia do this unknowingly!
you need to only await for it on the very first API call, not at the start of the first page load
*/




let _browserHash
export async function browserHash() {
	if (!_browserHash) _browserHash = (await subtleHash(Data({text: getBrowserFingerprintAndTag()}))).base32()
	return _browserHash
}
noop(async () => {

	log(await browserHash())//here's how you get the browser hash



})



/*
on day 2 you watched the fingerprint change on your fold!
so, this doesn't work at all

yesterday:
agent:Mozilla/. (Linux; Android ; K) AppleWebKit/. (KHTML, like Gecko) Chrome/... Safari/.;
renderer:ANGLE (Qualcomm, Adreno (TM) , OpenGL ES .);
vendor:Google Inc. (Qualcomm);

today:
agent:Mozilla/. (Linux; Android ; K) AppleWebKit/. (KHTML, like Gecko) Chrome/... Safari/.;
renderer:Adreno (TM) ;
vendor:Qualcomm;

*/














/*
environment detection exploration
a library function might be called by:
-a lambda function running node, either simulated locally by Serverless Framework or deployed to AWS Lambda
-a web worker, either simulated locally by wrangler, deployed to cloudflare workers running API code, or intended for client side but being hydrated by Nuxt on a worker
-a web browser, like the user's real browser running on their device, with a page
*/
export function detectEnvironment() {
	log(deindent(`
		detect environment: (not sure if this works, test each place!)

		'${typeof localStorage != 'undefined'}' localStorage ~ only browsers, and not hydration
		'${typeof importScripts != 'undefined'}' importScripts ~ only web workers
		'${typeof process != 'undefined'}' process ~ only node like lambda`))
}
noop(() => {
	detectEnvironment()
})
/*
didn't pick 'window' because it's there during nuxt's hydration step!

still eluding that is detecting Nuxt's hydration step, though. concepts for doing that include:

$nuxt or useNuxt or useNuxtApp or tryUseNuxtApp .context.ssrContext
https://nuxt.com/docs/guide/going-further/internals
all that seems deep under the hood

process.client, which you found from earlier, and looks to be a Nuxt thing

nuxt's <ClientOnly /> tag:
https://nuxt.com/docs/api/components/client-only

*/


/*
sorta related is, is Nuxt running in development or production?
you could run tiny tests on a CSS overlay, for instance, in development and not in production

process.env.NODE_ENV == 'development' or 'production', apparently, but you haven't tried this
*/

/*
you also want to find the best way to detect serverless framework lambda development versus production


*/












