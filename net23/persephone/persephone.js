//here's where you require all the node modules
//code here can use library functions
//lambdas can call in to functions here
//but library code can't use functions here
//so that is the order of things

let module_icarus
async function loadIcarus() { if (!module_icarus) module_icarus = await import('icarus'); return module_icarus }//icarus is ESM, so you have to await a dynamic import into this CommonJS module

let module_amazonEmail, module_amazonText, module_twilio, module_sendgrid//this project is CommonJS so that we can use require with node modules that may expect that classic styling
function loadAmazonEmail() { if (!module_amazonEmail) module_amazonEmail = require('@aws-sdk/client-ses'); return module_amazonEmail }
function loadAmazonPhone() { if (!module_amazonText)  module_amazonText  = require('@aws-sdk/client-sns'); return module_amazonText  }
function loadTwilioEmail() { if (!module_sendgrid)    module_sendgrid    = require('@sendgrid/mail');      return module_sendgrid    }
function loadTwilioPhone() { if (!module_twilio)      module_twilio      = require('twilio');              return module_twilio      }

/*
ttd november, await loadIcarus in every function is pretty cumbersome, so maybe once this is working, if you're feeling expeditionary, do try switching net23 to ESM and bringing in the four modules the ESM way; they should be able to handle it
but do this in a branch you abandon if things don't work out

chat says that the amazon stuff is ready for commonjs and ESM, while the twilio stuff expects commonjs (so let's see if it works with esm)

let module_amazonEmail, module_amazonText, module_twilio, module_sendgrid
async function loadAmazonEmail() { if (!module_amazonEmail) module_amazonEmail =  await import('@aws-sdk/client-ses');     return module_amazonEmail }
async function loadAmazonPhone() { if (!module_amazonText)  module_amazonText  =  await import('@aws-sdk/client-sns');     return module_amazonText  }
async function loadTwilioEmail() { if (!module_sendgrid)    module_sendgrid    = (await import('@sendgrid/mail')).default; return module_sendgrid    }
async function loadTwilioPhone() { if (!module_twilio)      module_twilio      = (await import('twilio')).default;         return module_twilio      }

also check sharp
*/

async function warmMessage(provider, service) {
	await loadIcarus()//warm icarus, too
	switch (provider+service) {
		case 'Amazon.Email.': loadAmazonEmail(); break
		case 'Amazon.Phone.': loadAmazonPhone(); break
		case 'Twilio.Email.': loadTwilioEmail(); break
		case 'Twilio.Phone.': loadTwilioPhone(); break
	}
}

async function sendMessage(provider, service, address, message) {
	let {getAccess, Sticker, checkEmail, checkPhone, look, logAudit} = await loadIcarus()

	let source = `${Sticker().all}.${provider}${service}`
	let content = `${source} ~ ${message}`

	let result
	if (service == 'Email.') {

		let access = await getAccess()
		let fromName = access.get('ACCESS_MESSAGE_BRAND')
		let fromEmail = access.get('ACCESS_MESSAGE_EMAIL')
		let toEmail = checkEmail(address).adjusted
		let subjectText = source
		let bodyText = content
		let bodyHtml = `<html><body><p style="font-size: 24px; color: gray; font-family: 'SF Pro Rounded', 'Noto Sans Rounded', sans-serif;">${content}</p></body></html>`

		if      (provider == 'Amazon.') { result = await sendEmail_useAmazon({fromName, fromEmail, toEmail, subjectText, bodyText, bodyHtml}) }
		else if (provider == 'Twilio.') { result = await sendEmail_useTwilio({fromName, fromEmail, toEmail, subjectText, bodyText, bodyHtml}) }

	} else if (service == 'Phone.') {
		let toPhone = checkPhone(address).normalized
		let messageText = content

		if      (provider == 'Amazon.') { result = await sendText_useAmazon({toPhone, messageText}) }
		else if (provider == 'Twilio.') { result = await sendText_useTwilio({toPhone, messageText}) }
	}
	logAudit('message', {provider, service, address, message, result})
	return result
}






//                       _ _                   _                     
//   ___ _ __ ___   __ _(_) |   __ _ _ __   __| |  ___ _ __ ___  ___ 
//  / _ \ '_ ` _ \ / _` | | |  / _` | '_ \ / _` | / __| '_ ` _ \/ __|
// |  __/ | | | | | (_| | | | | (_| | | | | (_| | \__ \ | | | | \__ \
//  \___|_| |_| |_|\__,_|_|_|  \__,_|_| |_|\__,_| |___/_| |_| |_|___/
//                                                                   

async function sendEmail_useAmazon(c) {
	let {getAccess, Now} = await loadIcarus()
	let access = await getAccess()

	let {fromName, fromEmail, toEmail, subjectText, bodyText, bodyHtml} = c
	let q = {
		Source: `"${fromName}" <${fromEmail}>`,//must be verified email or domain
		Destination: {ToAddresses: [toEmail]},
		Message: {
			Subject: {Data: subjectText, Charset: 'UTF-8'},
			Body: {//both plain text and html for multipart/alternative email format
				Text: {Data: bodyText, Charset: 'UTF-8'},
				Html: {Data: bodyHtml, Charset: 'UTF-8'}
			}
		}
	}
	let result, error, success = true

	let t1 = Now()
	try {
		const {SESClient, SendEmailCommand} = loadAmazonEmail()
		let client = new SESClient({region: access.get('ACCESS_AMAZON_REGION')})
		result = await client.send(new SendEmailCommand(q))
	} catch (e) { error = e; success = false }
	let t2 = Now()

	q.tick = t1
	return {c, q, p: {success, result, error, tick: t2, duration: t2 - t1}}
}

async function sendEmail_useTwilio(c) {
	let {getAccess, Now} = await loadIcarus()
	let access = await getAccess()

	let { fromName, fromEmail, toEmail, subjectText, bodyText, bodyHtml } = c
	let q = {
		from: {name: fromName, email: fromEmail},
		personalizations: [{to: [{email: toEmail}]}],
		subject: subjectText,
		content: [
			{type: 'text/plain', value: bodyText},
			{type: 'text/html',  value: bodyHtml}
		]
	}
	let result, error, success = true

	let t1 = Now()
	try {
		const sendgrid = loadTwilioEmail()
		sendgrid.setApiKey(access.get('ACCESS_SENDGRID_KEY_SECRET'))
		result = await sendgrid.send(q)
	} catch (e) { error = e; success = false }
	let t2 = Now()

	q.tick = t1
	return {c, q, p: {success, result, error, tick: t2, duration: t2 - t1}}
}

async function sendText_useAmazon(c) {
	let {getAccess, Now} = await loadIcarus()
	let access = await getAccess()

	let {toPhone, messageText} = c
	let q = {
		PhoneNumber: toPhone,
		Message: messageText,
	}
	let result, error, success = true

	let t1 = Now()
	try {
		const {SNSClient, PublishCommand} = loadAmazonPhone()
		let client = new SNSClient({region: access.get('ACCESS_AMAZON_REGION')})
		result = await client.send(new PublishCommand(q))
	} catch (e) { error = e; success = false }
	let t2 = Now()

	q.tick = t1
	return {c, q, p: {success, result, error, tick: t2, duration: t2 - t1}}
}

async function sendText_useTwilio(c) {
	let {getAccess, Now} = await loadIcarus()
	let access = await getAccess()

	let {toPhone, messageText} = c
	let q = {
		from: access.get('ACCESS_TWILIO_PHONE'),
		to: toPhone,
		body: messageText
	}
	let result, error, success = true

	let t1 = Now()
	try {
		const twilio = loadTwilioPhone()
		let client = twilio(access.get('ACCESS_TWILIO_SID'), access.get('ACCESS_TWILIO_AUTH_SECRET'))
		result = await client.messages.create(q)
	} catch (e) { error = e; success = false }
	let t2 = Now()

	q.tick = t1
	return {c, q, p: {success, result, error, tick: t2, duration: t2 - t1}}
}







































module.exports = {...module.exports, warmMessage, sendMessage}

async function requireModules() {
	let { Sticker, getAccess, log, look, Size, Data } = await loadIcarus()

	let cut = 512
	let o = {}
	try {
		o.intro = "modules are working, streamlining docker deploy"
		let access = await getAccess()

		//amazon
		const { SESClient, GetSendQuotaCommand } = require('@aws-sdk/client-ses')
		const mailClient = new SESClient({region: access.get('ACCESS_AMAZON_REGION')})
		o.amazonMail = look(mailClient.config).slice(0, cut)
		try {
			let quota = await mailClient.send(new GetSendQuotaCommand({}))
			o.amazonMailQuota = quota
		} catch (e2) {//permissions error deployed, but chat is explaining iam roles to define in serverless.yml
			o.amazonMailQuotaError = e2.stack
		}
		const { SNSClient } = require('@aws-sdk/client-sns')
		const textClient = new SNSClient({region: 'us-east-1'})
		o.amazonText = look(textClient.config).slice(0, cut)

		//twilio
		const _twilio = require('twilio')
		const _sendgrid = require('@sendgrid/mail')
		o.twilioRequired = look(_twilio).slice(0, cut)
		o.sendgridRequired = look(_sendgrid).slice(0, cut)
		let twilioClient = _twilio(access.get('ACCESS_TWILIO_SID'), access.get('ACCESS_TWILIO_AUTH_SECRET'))
		o.twilioClient = look(twilioClient).slice(0, cut)
		_sendgrid.setApiKey(access.get('ACCESS_SENDGRID_KEY_SECRET'))

		//sharp
		const _sharp = require('sharp')
		const b2 = await _sharp({
			create: {
				width: 200,
				height: 120,
				channels: 4,
				background: {r: 255, g: 0, b: 0, alpha: 1}
			}
		}).png().toBuffer()//returns a Node Buffer, which is a subclass of Uint8Array
		let d = Data({array: b2})
		o.sharpPngBase64 = d.base64()

		//done
		o.note = 'successfully finished! 🎉'

	} catch (e) { o.error = e.stack }
	return o
}

module.exports = {...module.exports, loadIcarus, requireModules}



























/*


try out now
node test: []email sendgrid, []sms twilio, []email amazon, []sms amazon
lambda local: []email sendgrid, []sms twilio, []email amazon, []sms amazon
lambda deployed: []email sendgrid, []sms twilio, []email amazon, []sms amazon
*/





/*
A note on fetch, exceptions, catch and throw, JSON parsing and stringification, and controlling what we can.

Exceptions from errors in our own code propagate upwards to be caught and logged at a higher level.
For example, JSON.stringify throws if it encounters a circular reference or a BigInt property.
But this is (1) highly unlikely and (2) indicates a serious error in our code.
So these exceptions are thrown up to be logged for us to fix.

Conversely, these functions are designed so that no matter how external APIs behave, they *cannot* throw up.
All issues related to API behavior and response are caught and returned as part of the result object, allowing the caller to handle them appropriately.
Unlike the coding errors mentioned earlier, these API-related issues are both (1) quite likely and (2) completely beyond our control.
The calling code will detect these issues, log them, and can implement round-robin failover to avoid relying on an API which was working great for weeks, and suddenly becomes problematic.

God, grant me the serenity to accept the things I cannot change,
Courage to change the things I can,
And wisdom to know the difference.
*/













async function snippet() {
	return 'turned off twilio snippet as that is moving to persophne'
	/*
	let twilio = await loadTwilio()
	let sendgrid = await loadSendgrid()
	let s = look({canGetAccess: canGetAccess(), twilio, sendgrid})
	log("hello from persephone snippet, here's twilio and sendgrid:", s)
	return s
	*/
}






/*
next to do now
[x]deployed, get the six dogs from the two doors, all at once
[x]deployed, toss each place, one at a time
[]local node, send the four messages
[]deployed, send the four messages

and check datadog, amazon, and twilio dashboards throughout!
*/




//let's test this stuff with node on the command line
async function snippet2(card) {
	log('hi from snippet')
	log(look(card))

	/*
	function style(text) {
		return `<html><body><p style="font-size: 18px; color: gray; font-family: 'SF Pro Rounded', 'Noto Sans Rounded', sans-serif;">${text}</p></body></html>`
	}
	let text = Sticker().all+" ~ Hello! Now with SF Pro Rounded for iPhone and Noto Sans Rounded for Android. Oh, also: Something about a quick fox, and a lazy dog, and jumping over."


	let result = await sendEmail_useSendgrid({
		fromName: card.fromName,
		fromEmail: card.fromEmail,
		toEmail: card.toEmail1,
		subjectText: 'hello 9',
		bodyText: text,
		bodyHtml: style(text)
	})
	await awaitLogAudit('snippet sent sendgrid email', {result})
	*/



}































