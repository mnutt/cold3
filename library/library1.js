
import { customAlphabet } from 'nanoid'
import Joi from 'joi'
import creditCardType from 'credit-card-type'
import { parsePhoneNumberFromString } from 'libphonenumber-js'

import {
wrapper,
} from '../wrapper.js'
import {
tagLength, Tag,
Now, sayDate, sayTick,
} from './sticker.js'
import {
Time,
noop, test, ok, toss,
log,
say, look,
checkText, checkAlpha,
randomBetween,
starts, cut,
onlyNumerals,
fraction, exponent, int, big, thinSpace,
} from './library0.js'







/*
notes about validation

modules you found:
joi has 9 million downloads and installs 6 packages
credit-card-type has half a million downloads and installs 1 package
libphonenumber-js has 5 million downloads and installs 1 package

current limitations in email:
-joi has a built in TLD whitelist, but some error meant you turned off that check

current limitations in phone:
-you're assuming US rather than telling libphonenumber what country to fit to

current limitations in card:
-joi validates the card, but can't group digits
-credit-card-type groups digits, and detects type from what the user has typed so far
TODO why are you using both joi and credit-card-type? maybe just use credit-card-type

data forms:
-raw, what the user put in the box
-adjusted, improved to make validation more likely to work, like trimmed or only digits
-presented, formatted for pretty human consumption, like grouping digits in a card number
-normalized, boiled down all the way to store in the database, and notice a duplicate

guaranteed data pathway:
raw -> adjusted -> presented
								-> normalized

email example:
raw: ' Bob.Frank@GMAIL.COM', what the user typed
adjusted: 'Bob.Frank@GMAIL.COM', light changes to pass validation; give adjusted to APIs
presented: 'Bob.Frank@gmail.com', heavier formatting, show the user presented on the page
normalized: 'bobfrank@gmail.com', heaviest changes, use normalized to prevent a duplicate

and so what do you pass to the email or credit card API?
probably adjusted, in case the user's weird way of writing it actually matters
the log of exactly what you told the api records adjusted

keep adjusted and normalized in the database
normalized to quickly detect a duplicate
adjusted for a later repeat use with the api
and when composing text for the page, do adjusted -> presented

uniformly, these validation functions take raw
and return an object like { raw, adjusted, presented, normalized, valid: true/false }
*/

//             _ _     _       _       
// __   ____ _| (_) __| | __ _| |_ ___ 
// \ \ / / _` | | |/ _` |/ _` | __/ _ \
//  \ V / (_| | | | (_| | (_| | ||  __/
//   \_/ \__,_|_|_|\__,_|\__,_|\__\___|
//                                     

const periodIgnorers = ['gmail.com', 'googlemail.com', 'proton.me', 'protonmail.com', 'pm.me', 'protonmail.ch']//these providers, gmail and protonmail, deliver mail addressed to first.last@gmail.com to the user firstlast@gmail.com
const _email = Joi.string().email({ tlds: { allow: false } }).required()//no list of true TLDs
export function validateEmail(raw) {

	/* (1) adjusted step for email
	trim space before and after
	don't touch space in the middle
	*/
	let adjusted = raw.trim()
	let j1 = _email.validate(adjusted)
	if (j1.error) return { j1, valid: false, raw, adjusted }

	/* (2) presented step for email
	leave the name the same, but lowercase the domain
	BOBSMITH@SPINDEX.BIZ clearly has his caps lock on, but maybe his email only works if you shout at him
	TomStoppard@SpeedOfArt.net is used to seeing his domain flattened
	*/
	let p = cut(adjusted, "@")
	let presented = p.before + "@" + p.after.toLowerCase()
	let j2 = _email.validate(presented)
	if (j2.error) return { j2, valid: false, raw, adjusted, presented }

	/* (3) normalized step for email
	here, we want to prevent MrMorgan@example.com from creating a second account as mrmorgan@example.com
	additionally, we want to notice that mr.morgan@gmail.com is the same guy as mrmorgan@gmail.com; this is gmail-specific
	if we find others like this, we can add them here, but database data won't have gone through the latest validator
	*/
	let name = p.before.toLowerCase()
	let domain = p.after.toLowerCase()
	name = cut(name, '+').before//name+spam@example.com is really name@example.com
	if (periodIgnorers.includes(domain)) name = name.replace(/\./g, '')//first.last@gmail.com is really firstlast@gmail.com
	let normalized = name + "@" + domain
	let j3 = _email.validate(normalized)
	if (j3.error) return { j3, valid: false, raw, adjusted, presented, normalized }

	return { valid: true, raw, adjusted, presented, normalized }
}
test(() => {

	//sanity check
	ok(!validateEmail('').valid)
	ok(validateEmail('name@example.com').valid)
	ok(validateEmail(' First.Last@EXAMPLE.COM\r\n').valid)

	//mistakes
	ok(!validateEmail('name#example.com').valid)//spaces
	ok(!validateEmail('first last@example.com').valid)//spaces
	ok(!validateEmail('first.last@example com').valid)
	ok(!validateEmail('first@last@example.com').valid)//two ats

	//dots
	ok(validateEmail('first.last@department.example.com').valid)//correct
	ok(!validateEmail('first.last@example..com').valid)
	ok(!validateEmail('first.last@.example.com').valid)
	ok(!validateEmail('first.last@example.com.').valid)
	ok(!validateEmail('first.last@example').valid)

	//joi doesn't like edge dots in name, either. this one you weren't even sure about
	ok(!validateEmail('.name@example.com').valid)
	ok(!validateEmail('name.@example.com').valid)

	//four forms when valid
	function f(raw, adjusted, presented, normalized) {
		let v = validateEmail(raw)
		ok(v.valid)
		ok(v.adjusted == adjusted)
		ok(v.presented == presented)
		ok(v.normalized == normalized)
	}
	//lowercasing to keep working, make pretty, and detect a duplicate
	f(' Name@Example.com ', 'Name@Example.com', 'Name@example.com', 'name@example.com')
	f(' NAME@EXAMPLE.COM ', 'NAME@EXAMPLE.COM', 'NAME@example.com', 'name@example.com')
	//preventing gmail users from making multiple accounts
	f(' first.last@hotmail.com ', 'first.last@hotmail.com', 'first.last@hotmail.com', 'first.last@hotmail.com')
	f(' first.last@gmail.com ', 'first.last@gmail.com', 'first.last@gmail.com', 'firstlast@gmail.com')
	f('a.b.c@proton.me', 'a.b.c@proton.me', 'a.b.c@proton.me', 'abc@proton.me')
	//outsmarting the +spam trick
	f('bob+spam@yahoo.com', 'bob+spam@yahoo.com', 'bob+spam@yahoo.com', 'bob@yahoo.com')
	f('bob+spam+note@yahoo.com', 'bob+spam+note@yahoo.com', 'bob+spam+note@yahoo.com', 'bob@yahoo.com')
	f('a.b+spam@proton.me', 'a.b+spam@proton.me', 'a.b+spam@proton.me', 'ab@proton.me')
})

export function validatePhone(raw) {

	/* (1) the americentric kludge
	libphonenumber-js works well when you tell it which country we think this phone number is in
	to make it work for common US 5553334444 and 15553334444 fat-fingering, there's this:
	*/
	let numerals = onlyNumerals(raw)
	let defaultRegion//leave undefined if not US
	if (numerals.length == 10 ||//assume all 10 digit numbers are US
		(numerals.length == 11 && starts(numerals, '1')))//or they also typed the 1 at the start
		defaultRegion = 'US'

	/* (2) adjusted and presented
	phone numbers are crazy, so here, we're leaning heavily on Android's libphonenumber-js
	we give it the raw text from the user, and make sure it returns something, which says valid
	we format it into a standard international form, and make sure that there are some numbers there
	but with regional codes, it could be different numbers, or a different number of numbers
	*/
	let phone = parsePhoneNumberFromString(raw, defaultRegion)
	if (!phone || !phone.isValid()) return { phone, valid: false, raw }
	let adjusted = phone.formatInternational()
	let presented = adjusted

	/* (3) normalized
	just numbers from libphonenumber-js
	*/
	let normalized = onlyNumerals(adjusted)
	if (!normalized.length) return { phone, valid: false, raw, adjusted }

	/* valid forms
	send adjusted to the SMS apis
	show presented to the user
	keep normalized in the database to guard against storing a duplicate
	*/
	return { phone, valid: true, raw, adjusted, presented, normalized }
}
test(() => {
	ok(!validatePhone('').valid)//blank
	ok(!validatePhone('5551234').valid)//local
	ok(!validatePhone('pizza').valid)//nonsense

	function f(country, normalized, raw, adjusted) {
		let v = validatePhone(raw)
		ok(v.valid)
		ok(v.phone.country == country)
		ok(v.adjusted == adjusted)
		ok(v.normalized == normalized)
	}

	//common typing
	f('US', '14155552671',   '4155552671', '+1 415 555 2671')
	f('US', '14155552671',  '14155552671', '+1 415 555 2671')
	f('US', '14155552671', '+14155552671', '+1 415 555 2671')

	//extra characters, still valid
	f('US', '14155552671',   '415 555 2671',     '+1 415 555 2671')
	f('US', '14155552671',   '415.555.2671',     '+1 415 555 2671')
	f('US', '14155552671',   '415-555-2671',     '+1 415 555 2671')
	f('US', '14155552671', ' \t415 5552671\r\n', '+1 415 555 2671')

	//around the world
	f('US', '14155552671',   '+14155552671',    '+1 415 555 2671')// United States
	f('GB', '442071838750',  '+442071838750',  '+44 20 7183 8750')// United Kingdom
	f('CA', '14165555555',   '+14165555555',    '+1 416 555 5555')// Canada
	f('AU', '61293744000',   '+61293744000',   '+61 2 9374 4000')// Australia
	f('DE', '493012345678',  '+493012345678',  '+49 30 12345678')// Germany
	f('FR', '33123456789',   '+33123456789',   '+33 1 23 45 67 89')// France
	f('JP', '81312345678',   '+81312345678',   '+81 3 1234 5678')// Japan
	f('IN', '911234567890',  '+911234567890',  '+91 1234 567 890')// India
	f('CN', '8613812345678', '+8613812345678', '+86 138 1234 5678')// China
	f('BR', '5511987654321', '+5511987654321', '+55 11 98765 4321')// Brazil
})

const _card = Joi.string().creditCard().required()
export function validateCard(raw) {

	/* (1) adjusted step for credit card number
	just numerals, removing spaces, dots, dashes
	/* (2) normalized is the same
	*/
	let adjusted = onlyNumerals(raw)
	let normalized = adjusted

	/* (3) intermediate step for a number the user hasn't finished typing yet
	use braintree's credit-card-type module to get the type
	this module also tells you how to group the numerals, start trying to do that
	*/
	let cardType = creditCardType(adjusted)//from npm credit-card-type
	if (!cardType.length) return { cardType, valid: false, raw, adjusted, normalized, note: 'no type' }
	let gaps = cardType[0].gaps//go with first identified type, but know that there can be several
	let gap = 0//index in the array of gaps
	let presented = ''
	for (let i = 0; i < adjusted.length; i++) {//loop for each numeral
		if (gap < gaps.length && i == gaps[gap]) {//weve reached a gap position
			presented += ' '//add a gap
			gap++//watch for the next gap
		}
		presented += adjusted[i]//bring in this numeral
	}
	if (onlyNumerals(presented) != adjusted) return { cardType, valid: false, raw, adjusted, presented, normalized, note: 'presented bad round trip' }

	/* (4) use joi once to validate at the end
	*/
	let j1 = _card.validate(adjusted)
	if (j1.error) return { cardType, j1, valid: false, raw, adjusted, presented, normalized }

	return { cardType, valid: true, raw, adjusted, presented, normalized }//also return the detected type information
}
test(() => {

	//chatgpt's list of valid international credit card numbers
	ok(validateCard('4111 1111 1111 1111').valid) // Visa
	ok(validateCard('5555 5555 5555 4444').valid) // MasterCard
	ok(validateCard('3782 822463 10005').valid) // American Express (Amex)
	ok(validateCard('6011 1111 1111 1117').valid) // Discover
	ok(validateCard('3566 1111 1111 1113').valid) // JCB (Popular in Japan)
	ok(validateCard('3056 9309 0259 04').valid) // Diners Club International
	ok(validateCard('6759 6498 2643 8453').valid) // Maestro (Popular in Europe)
	ok(validateCard('4000 0566 5566 5556').valid) // Carte Bancaire (Popular in France)
	ok(validateCard('6304 0000 0000 0000').valid) // Laser (Previously popular in Ireland)
	ok(validateCard('6071 7980 0000 0000').valid) // NPS Pridnestrovie (Popular in Transnistria)

	//should be valid, and from the same list, but joi doesn't like them, which is fine, i guess
	ok(!validateCard('6211 1111 1111 1111').valid) // China UnionPay (Popular in China)
	ok(!validateCard('5067 9900 0000 0000 0009').valid) // Elo (Popular in Brazil)
	ok(!validateCard('6062 8288 0000 0000').valid) // Hipercard (Popular in Brazil)
	ok(!validateCard('6071 9811 0000 0000').valid) // RuPay (Popular in India)
	ok(!validateCard('6370 0028 0000 0000').valid) // Interac (Popular in Canada)
	ok(!validateCard('5019 5555 5555 5555').valid) // Dankort (Popular in Denmark)
	ok(!validateCard('5610 0000 0000 0000').valid) // Bankcard (Popular in Australia)
	ok(!validateCard('2200 0000 0000 0000').valid) // Mir (Popular in Russia)
	ok(!validateCard('4779 9990 0000 0000').valid) // Zimswitch (Popular in Zimbabwe)

	//get the type soon as the user is typing, even when it's not valid yet
	function f(partial, type) {
		let v = validateCard(partial)
		ok(!v.valid)//not valid yet
		ok(v.cardType[0].niceType == type)//name of first possible type identified
	}
	f('4111', 'Visa')
	f('55', 'Mastercard')//braintree says not internally capitalized
	f('3782 822', 'American Express')

	//four forms when valid
	function f2(raw, adjusted, presented, normalized) {
		let v = validateCard(raw)
		ok(v.valid)
		ok(v.adjusted == adjusted)
		ok(v.presented == presented)
		ok(v.normalized == normalized)
	}
	f2('4111 1111 1111 1111',     '4111111111111111', '4111 1111 1111 1111', '4111111111111111')
	f2('4111111111111111',        '4111111111111111', '4111 1111 1111 1111', '4111111111111111')
	f2('4111-1111-1111-1111',     '4111111111111111', '4111 1111 1111 1111', '4111111111111111')
	f2('4111 1111 1111 1111\r\n', '4111111111111111', '4111 1111 1111 1111', '4111111111111111')
	f2('3782 822463 10005',  '378282246310005', '3782 822463 10005', '378282246310005')
	f2('3782 8224 6310 005', '378282246310005', '3782 822463 10005', '378282246310005')
})



























//generate some dummy posts
noop(() => {

	let quantity = 50
	let durationShort = 5*Time.minute
	let durationLong = 5*Time.day

	let n = Now()
	let when = n
	let earlier
	let s = ''
	for (let i = quantity; i >= 1; i--) {
		earlier = randomBetween(durationShort, durationLong)
		when -= earlier
		s += `\r\n{tag: '${tag()}', post: ${i}, quantity: ${quantity}, tick: ${when} },`
	}
	//log(s)
})


export function generatePosts(quantity) {
	let durationShort = 5*Time.minute
	let durationLong = 5*Time.day

	let posts = []

	let n = Now()
	let when = n
	let earlier
	let s = ''
	for (let i = quantity; i >= 1; i--) {
		earlier = randomBetween(durationShort, durationLong)
		when -= earlier

		posts.push({
			tag: Tag(),
			order: i,
			quantity: quantity,
			tick: when
		})
	}
	return posts
}


//dummy posts, later this will come from the database and be in pinia
let chronology = [
{tag: 'Fouv7hYGoytFMpU8JF0Fp', order: 50, quantity: 50, tick: 1716455539307 },
{tag: '9ybmRRMv7DkyyblkNvg7T', order: 49, quantity: 50, tick: 1716321894639 },
{tag: 'YnzMXqUGaU4yh1n8LdHag', order: 48, quantity: 50, tick: 1716137928364 },
{tag: 'HT11n28Iv82hlhuuSzCb0', order: 47, quantity: 50, tick: 1715978704727 },
{tag: 'hs5Ay6ZABoMOGFzBi1oyh', order: 46, quantity: 50, tick: 1715648092892 },
{tag: 'Rk9AeVaKsilRvwOO3YUfB', order: 45, quantity: 50, tick: 1715385111004 },
{tag: 'mTOttOiS3rR69OGjG1tvR', order: 44, quantity: 50, tick: 1715044766727 },
{tag: 'x32NK6ZDoRsmQbfSLZlGa', order: 43, quantity: 50, tick: 1714931303495 },
{tag: 'IE2VL7Co0Jt7q8dYXOXAt', order: 42, quantity: 50, tick: 1714727333266 },
{tag: 'O86XsWlaz4ta6cx16Q7IM', order: 41, quantity: 50, tick: 1714363110198 },
{tag: 'W78qwx7RwEgS26oEpUO2T', order: 40, quantity: 50, tick: 1714110838500 },
{tag: 'LWWpEotd0bsjnG7ARxkBA', order: 39, quantity: 50, tick: 1713728874624 },
{tag: 'rgLlcizQTbTrZwGwO52zf', order: 38, quantity: 50, tick: 1713419320801 },
{tag: 'ATALdIvNGgt57cTJdB1c3', order: 37, quantity: 50, tick: 1713378099230 },
{tag: 'IA6ZVmwZe4nxpRsqYdGC7', order: 36, quantity: 50, tick: 1713083064140 },
{tag: 'gzlKuZRrkq1QpVLQCWR1r', order: 35, quantity: 50, tick: 1712766656712 },
{tag: 'z7BWH5VzkdNEULWgX31CF', order: 34, quantity: 50, tick: 1712483923373 },
{tag: 'wH6vP23TMG3rSlogxIGKq', order: 33, quantity: 50, tick: 1712201991357 },
{tag: 'sKvZMRbUq10xnKjWMCuyH', order: 32, quantity: 50, tick: 1711795470621 },
{tag: 'xWeTKhoDh3vhI59eFTifV', order: 31, quantity: 50, tick: 1711740761762 },
{tag: 'RqzYoas2kdMLiy72e4ylN', order: 30, quantity: 50, tick: 1711399164136 },
{tag: 'qWW3MiOR6YV030VVsGs5l', order: 29, quantity: 50, tick: 1711157229938 },
{tag: 'G0QonkoCrx4tFom7kSjJQ', order: 28, quantity: 50, tick: 1711017080027 },
{tag: 'h9TKbMVxibNS94K0IKWu8', order: 27, quantity: 50, tick: 1710589463969 },
{tag: 'Xs57uky9VVJCnlEKEKea3', order: 26, quantity: 50, tick: 1710406061724 },
{tag: '6xUq3iwNvq24v6D3p7sdA', order: 25, quantity: 50, tick: 1709982957175 },
{tag: 'o4OJyHuH0G8qMfU8jSjkd', order: 24, quantity: 50, tick: 1709922737734 },
{tag: 'hM9jPxQSEEQBPxpHgiy18', order: 23, quantity: 50, tick: 1709672309425 },
{tag: 'AHkhsJ6EI8EM74M6zOy4A', order: 22, quantity: 50, tick: 1709241302124 },
{tag: 'F0VnEssG3rBUnF9HgkGC5', order: 21, quantity: 50, tick: 1708866753652 },
{tag: 'm036IiUkKGb899qGm8Np5', order: 20, quantity: 50, tick: 1708865723854 },
{tag: 'a3iY4QrGgqLASGWxWKpre', order: 19, quantity: 50, tick: 1708632254442 },
{tag: 'iCK0dTjFmXLeBTU2nyTx2', order: 18, quantity: 50, tick: 1708238475629 },
{tag: '4Tq6gURegueqbaug0vX0h', order: 17, quantity: 50, tick: 1708233767474 },
{tag: '56w1qDkNFyh1tykDfSW1z', order: 16, quantity: 50, tick: 1708206341461 },
{tag: 'aYfrIBit0gEevxyfSelzt', order: 15, quantity: 50, tick: 1707922248322 },
{tag: 'KAPNlvFDNpmOgCv0ksXlf', order: 14, quantity: 50, tick: 1707600171924 },
{tag: 'qoiOzOtBL1FxXXK4YSMWk', order: 13, quantity: 50, tick: 1707565602894 },
{tag: 'mDXOc16VmJ7MZmzlhArMm', order: 12, quantity: 50, tick: 1707355962825 },
{tag: 'EoF4DYlrR91pLwSn7vmbp', order: 11, quantity: 50, tick: 1707119235799 },
{tag: 'Q1OYdbUFVEHDE6coAjaqX', order: 10, quantity: 50, tick: 1707061636419 },
{tag: 'xmnlLx7N9n2YUzc58hWXY', order: 9, quantity: 50, tick: 1706702919517 },
{tag: 'RvXFcD5hiJijULzNwDDIO', order: 8, quantity: 50, tick: 1706662889740 },
{tag: 'nHsGz0kci0pdHdcYap3hr', order: 7, quantity: 50, tick: 1706287711293 },
{tag: 'oJarvWJkgYVD6btLeBndw', order: 6, quantity: 50, tick: 1706010726346 },
{tag: 'Ro36gVRki4uMClr6yXDW0', order: 5, quantity: 50, tick: 1705972706981 },
{tag: 'BqfnanFuCe8JxvdIJZ5ZZ', order: 4, quantity: 50, tick: 1705924197816 },
{tag: '4BpTznQcnkrZ1gdYoBzO5', order: 3, quantity: 50, tick: 1705727680431 },
{tag: 'NXLKpaWtjJFSjdfQkTexw', order: 2, quantity: 50, tick: 1705413227926 },
{tag: 'NR0vIdQZAwnEjhCZWe1ca', order: 1, quantity: 50, tick: 1705246581770 },
]

let lookup = {}
for (let i = 0; i < chronology.length; i++) {
	let p = chronology[i]
	lookup[p.tag] = p
}
export const postDatabase = { lookup, chronology }












/*
base32
to store sha256 hash values in the database in a column typed CHAR(52)
you want something short, and double-clickable, and length independent of data
AI4APBJZISGTL4DOOJRKYPSACN4YSR55NVOJDZCKGXFKEX4AEJHQ, for example

https://www.npmjs.com/package/rfc4648
~1 million weekly downloads
installed into icarus, and not the nuxt project

but Data is in library0
using that module would require elevating Data to library1
so you're bringing your own short functions
and this fuzz tester confirms they work the same as the module

using pad false and loose true
but Data will do a round-trip check
*/
/*
import { base32 } from 'rfc4648'
function cycle32(size) {
	let d = Data({random: size})
	let s1 = base32.stringify(d.array(), {pad: false})
	let s2 = d.base32()
	ok(s1 == s2)
	let d1 = Data({array: base32.parse(s1, {loose: true})})
	let d2 = Data({base32: s2})
	ok(d1.base16() == d2.base16())
}
function runFor(m, f) {
	let n = Now()
	let cycles = 0
	while (Now() < n + m) { cycles++; f() }
	return cycles
}
noop(() => {
	function f1() { let size = 32;                     cycle32(size) }//size of hash value
	function f2() { let size = randomBetween(1, 8);    cycle32(size) }//short
	function f3() { let size = randomBetween(1, 1024); cycle32(size) }//longer

	let cycles1 = runFor(1*Time.second, f1)
	let cycles2 = runFor(1*Time.second, f2)
	let cycles3 = runFor(1*Time.second, f3)
	//log(cycles1, cycles2, cycles3)
})
*/










/*
first, just get
import { visualizer } from 'rollup-plugin-visualizer'
from nuxt.congif.ts into vite.config.js, should be easier than before

[]have git and seal correctly include, count, exclude, hash, skip, icarus' stats.html
actually looks like that's already going to be git ignored, yes hashed, not counted as code



*/






/*
these are all single line text boxes
with text based live feedback
and then validation, and different forms

email
phone
email or phone, the combination of those two
password

try out a bunch of modules in icarus
see their bundle size cost in the tree view page
then pick one, install it in cold3, remove the others in icarus

this also is your return to these:
		"credit-card-type": "^10.0.0",  //these five utility modules are dependencies all three places
		"joi": "^17.13.1",
		"libphonenumber-js": "^1.11.3",
do you really need them all? how big are they compared to what you're bringing in for passwords?

ok nevermind, the only good password module is the one from dropbox and it's huge so server side only


password strength: weak, okay, strong, very strong
x long enough (6+)
x mixed case
x numbers
x special characters
three of those


out of the box
compute and tell the user a crack time
18 years: strong
and record this in the database so you can see
only show after weak

have tips, like:
make longer
use upper and lower case
use numbers
use special characters

and for weak, ok, strong, very storng, choose based on years

ok, what's the math

(variety ^ length) * 10ms / year
are you going to need bignum for that? you've got fraction()


Strong: 250 years to guess; make it longer!
use letters and numbers!
mix upper and lower case!
add some special characters!
Very strong: 26 000 000 years to guess

so its rating, time, and suggestion
yeah, that's cool

length^exponent *10ms /msinyear /2 for 50% odds
and see how long you can make one before you get near js max int in years, essentially

1234 thousand years to guess

write a function that takes c and says if it's lower, upper, numeral, or other




password is 6 characters long
characters are letters and numbers, only, so an alphabet of 62
62^6 = 568002355840 permutations

a guess takes 10 milliseconds
so guessing them all will take 568002355840*10 = 5680023558400ms
there are                                          31557600000ms in a year

*/





export function testBox(s) {
	return look(measurePasswordStrength(s))
}


/*
*/
function measurePasswordStrength(s) {
	let o = {}
	o.length = s.length
	o.hasUpper = /[A-Z]/.test(s)
	o.hasLower = /[a-z]/.test(s)
	o.hasDigit = /\d/.test(s)
	o.hasOther = /[^a-zA-Z\d]/.test(s)

	o.alphabet = 0//how many different characters could be in this password based on the variety of characters we've seen
	if (o.hasUpper) o.alphabet += 26//if it has one uppercase letter, imagine there could be any uppercase letter
	if (o.hasLower) o.alphabet += 26
	if (o.hasDigit) o.alphabet += 10
	if (o.hasOther) o.alphabet += 32//while we allow any characters in passwords, OWASP lists 32 special characters, and most users will probably choose passwords with special characters from that list
	o.permutations = exponent(o.alphabet, o.length)//how many possible passwords exist of this length and variety
	o.guessYears = fraction([o.permutations, 10], [Time.year, 2]).quotient//how many years it might take to crack this password, assuming a fast computer that can hash a guess in 10 milliseconds, and a successful guess after trying one half (2) of permutations

	if      (o.guessYears <    1) o.sayStrength = 'Weak'
	else if (o.guessYears <   10) o.sayStrength = 'Okay'
	else if (o.guessYears < 1000) o.sayStrength = 'Strong'
	else                          o.sayStrength = 'Very Strong'

	o.acceptable = !(o.guessYears < 1)//allow passwords above weak
	o.sayEndurance = sayHugeInteger(o.guessYears)

	if      (o.length < 6)                             o.sayImprovement = 'Add more characters, please'
	else if (o.hasUpper != o.hasLower)                 o.sayImprovement = 'Mix upper and lower case'
	else if (o.hasDigit != (o.hasUpper || o.hasLower)) o.sayImprovement = 'Use letters and numbers'
	else                                               o.sayImprovement = 'Add a special character'

	if (o.sayStrength == 'Weak') {
		o.sayStatus = `Strength: ${o.sayStrength}. ${o.sayImprovement}.`
	} else if (o.sayStrength == 'Okay') {
		o.sayStatus = `Strength: ${o.sayStrength}. ${o.sayEndurance} to guess. ${o.sayImprovement}.`
	} else if (o.sayStrength == 'Strong') {
		o.sayStatus = `${o.sayStrength}. ${o.sayEndurance} to guess. ${o.sayImprovement}.`
	} else if (o.sayStrength == 'Very Strong') {
		o.sayStatus = `${o.sayStrength}. ${o.sayEndurance} to guess.`
	}
	return o
}


function sayHugeInteger(i) {
	let b = big(i)
	const units = ['', ' thousand', ' million', ' billion', ' trillion', ' quadrillion', ' quintillion', ' sextillion', ' septillion', ' octillion', ' nonillion', ' decillion']
	let u = 0
	while (b >= 1000n && u < units.length - 1) {
		b /= 1000n
		u++
	}
	return `${sayGroupDigits(b+'')}${units[u]} year${sayPlural(i)}`
}

export function sayPlural(i) {
	return i == 1 ? '' : 's'
}
test(() => {
	ok(sayPlural(0) == 's')//like "0 carrots"
	ok(sayPlural(1) == '') //like "1 carrot"
	ok(sayPlural(2) == 's')//like "2 carrots"
})



export function sayGroupDigits(s, thousandsSeparator) {
	if (!thousandsSeparator) thousandsSeparator = thinSpace
	let minus = ''
	if (s.startsWith('-')) { minus = '-'; s = s.slice(1) }//deal with negative numbers
	if (s.length > 4) {//let a group of four through
		s = s.split('').reverse().join('')//reversed
		s = s.match(/.{1,3}/g).join(thousandsSeparator)//grouped reverse
		s = s.split('').reverse().join('')//forward again
	}
	return minus+s
}




/*
export function disk(wrapper) {//make an ASCII picture of a floppy disc, all vaporwave-style


	return {
		disk:''//the picture
		hash:'',//the first seven digits of the hash
		year:2024,//the year
		full:36//the percent full

	}
}

/*
$ node disk, just shows it, rather than seal which makes it
*/



//ok, total vanity, but here's the ascii disk in a readme.md for github
//exclude it from hashing, include it in git, and []move existing notes to the top of net23.txt

const floppyDiskCapacity = 1474560//1.44 MB capacity of a 3.5" floppy disk
const labelWidth = 16
noop(() => {

	let codeSizeDiskPercent = Math.round(wrapper.codeSize*100/floppyDiskCapacity)

	let date = sayDate(wrapper.tick)
	let year = date.slice(0, 4)

	let line1 = extend(' ', `${wrapper.name} ~ ${wrapper.hash.slice(0, 7)}`)
	let line2 = extend('_', `${sayDate(wrapper.tick)}`)
	let line3 = extend('_', `${wrapper.codeFiles}_files`)
	let line4 = extend('_', `${wrapper.codeSize}_bytes`)
	let line5 = extend('_', `disk_filled_${codeSizeDiskPercent}%`)
	function extend(padding, line) { return line.padEnd(labelWidth, padding).slice(0, labelWidth) }

	let markdownBody = `
${'```'}
 ____________________
| |${line1        }| |
|.|________________|H|
| |${line2        }| |
| |${line3        }| |
| |${line4        }| |
| |${line5        }| |
| |________________| |
|                    |
|    ____________    |
|   |   |  _     |   |
|   |   | | |    |   |
|   |   | |_|    | V |
|___|___|________|___|

${'```'}

How quick, simple, and cheap can the web2 stack be in ${year}?
[One person](https://world.hey.com/dhh/the-one-person-framework-711e6318)
exploring pouring and curing a
tiny [monolith](https://signalvnoise.com/svn3/the-majestic-monolith/).
`
	log(markdownBody)
})



//you could also log this out
//and put it at the top of index.html for view source?


/*
here's a good first pinia task, maybe
have log output that shows in /log, and any page, as you click around, can add to
*/


















































