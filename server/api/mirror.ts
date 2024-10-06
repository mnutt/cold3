
import { log, see, Now } from '@/library/library0.js'
import { Tag } from '@/library/library1.js'
import { Sticker } from '@/library/sticker.js'

export default defineEventHandler((event) => {

	let o = {}
	o.message = 'hello from cold3 api mirror, version 2024oct6b'
	o.serverTick = Now()
	o.headers = event.req.headers
	//use defined() and hasText() below
	o.accessLength = (typeof process != 'undefined' && typeof process.env?.ACCESS_PASSWORD_SECRET == 'string') ? process.env.ACCESS_PASSWORD_SECRET.length : 0
	o.tag = Tag()
	o.sayEnvironment = Sticker().all

	return o;
});

