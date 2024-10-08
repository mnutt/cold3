
//no imports, ping's library is lean to be fast as possible
import { customAlphabet } from 'nanoid'//well, except this small module
import { wrapper } from '../wrapper.js'//and the shrinkwrap wrapper

//import { Access } from './library2.js'//october you have to get rid of this because it'll bring in the whole library. you realize now this means access will go here into sticker, and that's probably fine? or, put the time zone in wrapper, you guess. although here in sticker is fine probably because sticker is the library that is small and absolutely fundamental, with tick and tag and environment detection and shrinkwrap information, so environment variables and secrets make sense here
//^october didn't work at all, just commented out the custom time zone feature for now


/*
TODO october []resolve this and other todo tags tagged as october
you've tagged "october" elsewhere in the code related to this, take care of them all soon!

october notes are in:
PasswordComponent.vue
library0.js
library2.js
sticker.js, here
test.js

updating wrangler meant you had to get secrets through nuxt
so you wrote Access,
and have to call saveUseRuntimeConfigFunction(useRuntimeConfig) for it to work

you're using ACCESS_ for three things
1 actual api keys
2 the local time zone
3 public factory presets
4 there are also those personal email addresses and phone numbers in env.js

the issue with 2 is you want sticker to be fast and reliable
so maybe move local time zone to wrapper

for 3, return to just putting them in the .vue file, this was fine

for 4, soon those can go away because you'll just type them into a box on a page
thinking academically, are they compromised even if not in source code, like do they get built into the compiled front end?
you could put 2 in here, if you keep this around. really, though, you should just make 2 a minute number in wrapper.js so it's quick and easy for sticker to get

for 1, it's working, but it's a cumbersome mess
so here's a cowboy bike shed idea:
there's only one secret, the private key which decrypts them all
this is in .env files, .dev.vars, lambda, cloudflare, nuxt, all those places
the details are encrypted and encoded base62 in wrapper.js or a separate file

benefits:
you can see and set your secrets locally, in one place not five
you can iterate through all of them, assuredly, you don't need a list of them as another one
you have them all, or none of them, so you won't run into just one is different or broken
no worry of formatting or encoding differences all the different environments

design:
secret.txt - git ignores it but shrinkwrap hashes it
secret.js - $ node secret packages it up
(more)
where's the public key? this doesn't need to be in git
(keep this separate, or add this as a feature to shrinkwrap)





*/











//      _          _       _                                    _   _      _             
//  ___| |__  _ __(_)_ __ | | ____      ___ __ __ _ _ __    ___| |_(_) ___| | _____ _ __ 
// / __| '_ \| '__| | '_ \| |/ /\ \ /\ / / '__/ _` | '_ \  / __| __| |/ __| |/ / _ \ '__|
// \__ \ | | | |  | | | | |   <  \ V  V /| | | (_| | |_) | \__ \ |_| | (__|   <  __/ |   
// |___/_| |_|_|  |_|_| |_|_|\_\  \_/\_/ |_|  \__,_| .__/  |___/\__|_|\___|_|\_\___|_|   
//                                                 |_|                                   

export function Sticker() {

	//gather information for the sticker we're making
	let now = Now()
	let tag = Tag()
	let environment = senseEnvironment()

	//prepare the sticker object we will return
	let sticker = {}

	//include the wrapper
	sticker.wrapper = wrapper

	//include the tick now, and a tag to uniquely identify this call to Sticker() right now
	sticker.now = now
	sticker.tag = tag

	//include core information to log or parse later
	sticker.core = {}

	sticker.core.callTick = now//about this call to get the sticker right now
	sticker.core.callTag  = tag

	sticker.core.sealedHash = wrapper.hash//about what's running
	sticker.core.sealedWhen = wrapper.tick

	sticker.core.where = environment.title//about where we're running
	sticker.core.whereTags = environment.tagsArray
	sticker.core.isCloud = environment.title.includes('Cloud')//true if deployed, false if running locally

	//based on that information we've already included, compose some text for easy reading
	let saySealedHash = wrapper.hash.substring(0, 7)
	let saySealedWhen = sayDate(wrapper.tick)
	sticker.where = environment.title
	sticker.what  =                       saySealedWhen+'.'+saySealedHash
	sticker.all   = environment.title+'.'+saySealedWhen+'.'+saySealedHash+'.'+sayTick(now)

	//and for easy checking
	sticker.isCloud = environment.title.includes('Cloud')
	sticker.isLocal = environment.title.includes('Local')

	return sticker
}

//                                            _                                      _   
//  ___  ___ _ __  ___  ___    ___ _ ____   _(_)_ __ ___  _ __  _ __ ___   ___ _ __ | |_ 
// / __|/ _ \ '_ \/ __|/ _ \  / _ \ '_ \ \ / / | '__/ _ \| '_ \| '_ ` _ \ / _ \ '_ \| __|
// \__ \  __/ | | \__ \  __/ |  __/ | | \ V /| | | | (_) | | | | | | | | |  __/ | | | |_ 
// |___/\___|_| |_|___/\___|  \___|_| |_|\_/ |_|_|  \___/|_| |_|_| |_| |_|\___|_| |_|\__|
//                                                                                       

//sense the environment and report fingerprint details like:
//"CloudLambda:Eigh.Envi.Glob.Lamb.Node.Proc.Regi.Zulu, 1725904754597, vYYYYmmmDl"
//the insanity that follows is you trying to be able to sense what and where is running us
const _senseEnvironmentVersion = 1//first version, if you change how this works at all, increment!
const _senseEnvironment = `
               Aclo Clie Docu Doma Loca                Lamb Node Proc Regi Requ Scri Self Serv Stor      Zulu >Determining
                                        Eigh Envi Glob      Node Proc                                         >LocalNode
Achr Asaf Awin           Docu      Loca                                              Self      Stor Wind      >LocalVite
                                        Eigh Envi Glob      Node Proc Regi                                    >LocalLambda
                                        Eigh Envi Glob Lamb Node Proc Regi                               Zulu >CloudLambda
                                        Eigh Envi Glob      Node Proc                     Serv                >LocalNuxtServer
               Aclo                          Envi                Proc           Scri Self                Zulu >CloudNuxtServer
                                        Eigh Envi Glob      Node Proc      Requ           Serv                >LocalPageServer
                                             Envi                Proc           Scri Self Serv           Zulu >CloudPageServer
Achr Asaf Awin      Clie Docu      Loca                          Proc                Self      Stor Wind      >LocalPageClient
Achr Asaf Awin           Docu Doma                                                   Self      Stor Wind      >CloudPageClient
`
export function senseEnvironment() {
	function type(t) { return t != 'undefined' }
	function text(o) { return typeof o == 'string' && o != '' }
	let a = []
	if ((new Date()).getTimezoneOffset() === 0)  a.push('Zulu')//deployed environments are in utc
	if (type(typeof process)) {                  a.push('Proc')//has process object iself
		if (text(process?.versions?.v8))                  a.push('Eigh')//v8 version
		if (text(process?.versions?.node))                a.push('Node')//node version
		if (text(process?.env?.ACCESS_NETWORK_23_SECRET)) a.push('Envi')//environment variables
		if (text(process?.env?.AWS_EXECUTION_ENV))        a.push('Lamb')//amazon
		if (text(process?.env?.AWS_REGION))               a.push('Regi')
		if (process?.client)                              a.push('Clie')//nuxt client
		if (process?.server)                              a.push('Serv')//nuxt server
	}
	if (type(typeof navigator) && text(navigator?.userAgent)) {//start tags from the user agent with A
		if (navigator.userAgent.includes('Android'))    a.push('Aand')
		if (navigator.userAgent.includes('iOS'))        a.push('Aios')
		if (navigator.userAgent.includes('iPhone'))     a.push('Aiph')
		if (navigator.userAgent.includes('iPad'))       a.push('Aipa')
		if (navigator.userAgent.includes('Windows'))    a.push('Awin')
		if (navigator.userAgent.includes('macOS'))      a.push('Amac')
		if (navigator.userAgent.includes('Chrome'))     a.push('Achr')
		if (navigator.userAgent.includes('Safari'))     a.push('Asaf')
		if (navigator.userAgent.includes('Firefox'))    a.push('Afir')
		if (navigator.userAgent.includes('Edge'))       a.push('Aedg')
		if (navigator.userAgent.includes('Cloudflare')) a.push('Aclo')
	}
	if (type(typeof location) && text(location?.hostname)) {
		if (location.hostname.includes('localhost')) a.push('Loca')
		if (location.hostname.includes('.'))         a.push('Doma')//dot indicates deployed domain name
	}
	if (type(typeof global))        a.push('Glob')
	if (type(typeof require))       a.push('Requ')
	if (type(typeof window))        a.push('Wind')
	if (type(typeof document))      a.push('Docu')
	if (type(typeof self))          a.push('Self')
	if (type(typeof localStorage))  a.push('Stor')
	if (type(typeof importScripts)) a.push('Scri')
	a = a.sort()//alphebetize the list
	let s = a.join('.')

	let patterns = {}
	let lines = _senseEnvironment.trim().split('\n')
	lines.forEach(line => {
		let [tags, title] = line.split('>')
		tags = tags.replace(/\s+/g, ' ').trim()
		patterns[title] = tags
	})
	let determining = patterns.Determining.split(' '); delete patterns.Determining
	let scores = {}
	Object.keys(patterns).forEach(k => { let title = k; let tags = patterns[k]
		scores[title] = 0
		determining.forEach(d => {//check each determining tag, awarding a point if its presence in pattern and candidate s match
			if (tags.includes(d) == s.includes(d)) scores[title] = scores[title]+1
		})
	})
	let winningScore = 0; let winningTitle = ''
	for (const [k, v] of Object.entries(scores)) {
		if (v > winningScore) { winningScore = v; winningTitle = k }
	}
	return {senseEnvironmentVersion: _senseEnvironmentVersion, tagsArray: a, tags: s, title: winningTitle }
}
/*
todo, more of these you're hearing about later
and after all that, you find out (but have not yet confirmed) that you can look for
process.env.NUXT_ENV to be set, and process.env.NODE_ENV to 'development' or 'production'
*/







//helper functions, this one's special for sticker:

//say the tick count t as a date like "2024sep09"
export function sayDate(t) {
	let d = new Date(t)
	return (
		d.getUTCFullYear()//year
		+d.toLocaleString('en', {month: 'short', timeZone: 'UTC'}).toLowerCase()//month
		+(d.getUTCDate()+'').padStart(2, '0'))//day
}

//and these are copied from library0 for now, because that would be a messy refactor:

export const Now = Date.now//just a shortcut

//october resolve this current thing where you've got sayTick in sticker and library0; have it use wrapper local minute number, have it be only in sticker, grand means importers don't care where it's from
//say a tick count t like "Sat11:29a04.702s" in the local time zone that I, reading logs, am in now
export function sayTick(t) {

	//in this unusual instance, we want to say the time local to the person reading the logs, not the computer running the script
	let zone = Intl.DateTimeFormat().resolvedOptions().timeZone//works everywhere, but will be utc on cloud worker and lambda
//	zone = Access('ACCESS_TIME_ZONE')//use what we set in the .env file. page script won't have access to .env, but worker and lambda, local and deployed will
//^october yeah that didn't work at all, you need to rethink time zones now that getting to secrets is hard

	let d = new Date(t)
	let f = new Intl.DateTimeFormat('en', {timeZone: zone, weekday: 'short', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit'})
	let parts = f.formatToParts(d)

	let weekday = parts.find(p => p.type == 'weekday').value
	let hour = parts.find(p => p.type == 'hour').value
	let minute = parts.find(p => p.type == 'minute').value
	let second = d.getSeconds().toString().padStart(2, '0')
	let millisecond = d.getMilliseconds().toString().padStart(3, '0')
	let ap = parts.find(p => p.type == 'dayPeriod').value == 'AM' ? 'a' : 'p'

	return `${weekday}${hour}:${minute}${ap}${second}.${millisecond}s`
}
export function defined(t) { return t != 'undefined' }
export function hasText(s) { return (typeof s == 'string' && s.length && s.trim() != '') }

//and these are copied from library1.js, and use nanoid:

export const tagLength = 21//we're choosing 21, long enough to be unique, short enough to be reasonable

//generate a new universally unique double-clickable tag of 21 letters and numbers
export function Tag() {
	const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'//removed -_ for double-clickability, reducing 149 to 107 billion years, according to https://zelark.github.io/nano-id-cc/
	return customAlphabet(alphabet, tagLength)()//same default nanoid length
}



/*
ok, without renaming sticker.js to library-1, essentially
you are exporting some of these fundamentals
so feel free to import them from here as you code onwards
and then later, and maybe, actually remove them from library0, and refactor everyone to get them from here, instead

library0 can still be no imports
it's just that now you get Tag from sticker, not library1!




*/




