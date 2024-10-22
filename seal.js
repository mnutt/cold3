
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import glob from 'fast-glob'
import dotenv from 'dotenv'; dotenv.config()//put .env properties on process.env

import {
wrapper,
log, look, newline, Data, Now,
encrypt
} from './library/grand.js'

//      _          _       _                                               _ 
//  ___| |__  _ __(_)_ __ | | ____      ___ __ __ _ _ __    ___  ___  __ _| |
// / __| '_ \| '__| | '_ \| |/ /\ \ /\ / / '__/ _` | '_ \  / __|/ _ \/ _` | |
// \__ \ | | | |  | | | | |   <  \ V  V /| | | (_| | |_) | \__ \  __/ (_| | |
// |___/_| |_|_|  |_|_| |_|_|\_\  \_/\_/ |_|  \__,_| .__/  |___/\___|\__,_|_|
//                                                 |_|                       

/*
	a summary of how this script encrypts secrets and generates the shrinkwrap seal wrapper

	./.env.local          add and edit application defined secrets the one place

	./.env                store secret symmetric encryption key here for node
	./.dev.vars           and also here for cloudflare wrangler to make available to nitro in nuxt
	./net23/.env          and also here for serverless framework to use locally and deploy to lambda
	                      and also set it in the cloudflare dashboard
	                      icarus using vite is front-end and correctly can't reach it

	./seal.js             $ npm run seal to generate the next two files:
	./wrapper.txt         first, a file manifest
	./wrapper.js          from that, hash and date of the manifest, versioning the code
	                      and including the contents of .env.local encrypted with the secret symmetric key
	./library/sticker.js  sticker.js imports wrapper.js, adding environment detection, a tick and tag
*/
async function seal() {
	let list = await listFiles()
	let properties = await hashFiles(list)
	let manifest = await composeWrapper(properties)
	await affixSeal(properties, manifest)
}
seal()

async function listFiles() {

	//list all the files that are a part of this project in its current form; configuration, code, and notes
	let paths = await glob('**/*', {
		dot: true,//include unix-style hidden files like .hidden
		ignore: [//ignore these paths, notice we're intentionally including some things, like .env, that git ignores
			'**/.DS_Store',//ignore this bothersome apple computer nonsense from the 1990s
			'**/.git',
			'**/.nuxt',
			'**/.wrangler',
			'**/.serverless',
			'**/*.log',
			'**/*.diff',
			'**/diff*.txt',
			'**/dist',
			'**/node_modules',
			'**/stats.html',

			//also leave out the two that this script generates; less blockchain-ey, but possible to return to the hash before a change. these absolutely get checked into git, though!
			'wrapper.txt',
			'wrapper.js'
		]
	})
	return paths.sort()//alphebetize, unfortunately does not keep folders grouped together like they look in File Manager
}

async function hashFiles(paths) {

	//given the array of paths, make an array of properties with each file sized and hashed
	let properties = []
	for (let path of paths) {
		let contents = await fs.readFile(path)
		let size = contents.length
		let hash = Data({array: crypto.createHash('sha256').update(contents).digest()})
		properties.push({path, size, hash})
	}
	return properties
}

async function composeWrapper(properties) {

	//compose the contents of wrapper.txt, a listing of hashes, paths, and sizes
	let lines = properties.map(p => `${p.hash.base32()} ${p.path}:${p.size}`)//put size after : because it can't be part of a filename on windows or mac
	let manifest = lines.join(newline)+newline
	await fs.writeFile('wrapper.txt', manifest)//write the file to disk
	return manifest//also return the file contents as we'll hash them next
}

const envSecretFileName = '.env.local'//our file of secrets to encrypt
const floppyDiskCapacity = 1474560//1.44 MB capacity of a 3.5" floppy disk
async function affixSeal(properties, manifest) {

	//total up the files, counting those that are something we wrote or created, versus everything
	let codeFiles = 0, codeSize = 0, totalFiles = 0, totalSize = 0
	for (let f of properties) {
		totalFiles++; totalSize += f.size
		if (!f.path.endsWith('package-lock.json') && !f.path.endsWith('.gif') && !f.path.endsWith('.png')) { codeFiles++; codeSize += f.size }
	}

	//compute the shrinkwrap hash of this version snapshot right now, which is the hash of wrapper.txt
	let hash = Data({array: crypto.createHash('sha256').update(manifest).digest()})

	//encrypt the secrets in .env.local
	let envSecretContents = await fs.readFile(envSecretFileName, 'utf8')//specify utf8 to get a string
	let cipherData = await encrypt(Data({base62: process.env.ACCESS_KEY_SECRET}), envSecretContents)

	//compose contents for the new wrapper.js
	let o = {...wrapper}//copy all the properties into a new object
	o.tick = Now()//update individual properties in the new object
	o.hash = hash.base32()
	o.codeFiles = codeFiles
	o.codeSize = codeSize
	o.totalFiles = totalFiles
	o.totalSize = totalSize
	o.secrets = cipherData.base62()
	let s = `export const wrapper = Object.freeze(${JSON.stringify(o, null, 2)})`
	s = s.replace(/\n/g, newline)+newline//switch newlines to \r\n to work well on both mac and windows

	//overwrite wrapper.js, which the rest of the code imports to show the version information like name, date, and hash
	await fs.writeFile('wrapper.js', s)

	//output a summary to the shrinkwrapper
	let codeSizeDiskPercent = Math.round(codeSize*100/floppyDiskCapacity)
	log('',
		`${codeFiles} files and ${codeSize} bytes code; your 3.5" floppy disk is filled ${codeSizeDiskPercent}%`,
		`${totalFiles} files and ${totalSize} bytes total`,
		'',
		`${hash.base32()} shrinkwrap hash`)
}
