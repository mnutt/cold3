
/*
database.js
database schema, sql statements to create the tables
database utility functions
interface between the application and the database
keep it all here together for easy refactoring and auditing
*/

import { log, toss, Now, checkInt, hasText, defined, test, ok } from './library0.js'
import { Tag, checkTag } from './library1.js'

import { createClient } from '@supabase/supabase-js'

let supabase;
if (defined(typeof process) && hasText(process?.env?.ACCESS_SUPABASE_URL)) supabase = createClient(process.env.ACCESS_SUPABASE_URL, process.env.ACCESS_SUPABASE_KEY)



/*
the database keeps booleans as the BIGINT numbers 0 and 1
this lets you use fewer different types overall
and also later on overload these booleans into enums with 2 and -1 and whatever

this means when storing booleans, you have to call booleanToInt() below

when reading booleans, just read the numbers
it's totally find if they float up through the stack
this is why there's no corresponding function intToBoolean()
*/
export function booleanToInt(b) { return b ? 1 : 0 }
//when getting booleans out of the database, it's fine if numbers 0 and 1 float upwards
//so, there's no intToBoolean
//this is also necessary



//previous failed design:
/*
//you need this because you're storing booleans in the database as numbers like 0 false, 1 true
export function intToBoolean(i, minimum) {//if we've overloaded this database cell to hold enumerations like -1, pass minimum -1, otherwise defaults to 0
	checkInt(i, minimum)
	if      (i == 1) return true
	else if (i == 0) return false
	else toss('data', {i, minimum})
}
export function booleanToInt(b) {
	if (typeof b != 'boolean') toss('type', {b})
	return b ? 1 : 0
}
test(() => {
	let n = 0//first, just to confirm how javascript works
	let b = false
	ok(typeof n == 'number')
	ok(typeof b == 'boolean')

	ok(intToBoolean(0) === false && booleanToInt(false) === 0)
	ok(intToBoolean(1) === true  && booleanToInt(true)  === 1)
})
*/











/*
SQL statements fed into Supabase to create the database tables.
Here in text notes; it would be better if they were tracked in git some other way!

-- settings for the whole application
CREATE TABLE settings_table (
	key_text    TEXT  PRIMARY KEY  NOT NULL, -- name of the setting
	value_text  TEXT                         -- value, text or numerals
);

-- counts for each browser, works without being signed in
CREATE TABLE counts_table (
	browser_tag  CHAR(21)  PRIMARY KEY  NOT NULL, -- browser tag
	count        BIGINT                 NOT NULL
);

-- records of browsers signing in with password and signing out
CREATE TABLE access_table (
	row_tag      CHAR(21)  PRIMARY KEY  NOT NULL, -- row tag
	row_tick     BIGINT                 NOT NULL, -- when inserted
	browser_tag  CHAR(21)               NOT NULL, -- browser tag
	signed_in    BIGINT                 NOT NULL  -- 0 signed out or 1 signed in
);
-- composite index to make a filtering by browser tag and sorting by tick fast
CREATE INDEX access_index_on_browser_tick ON access_table (browser_tag, row_tick);

finding your convention for names in the database, which is sausage_case
and types are at the end, so access_table and row_tick names tell you that's a table, and a tick

using the supabase dashboard, there's no CHAR(21) type
to enter these commands:
supabase dashboard
left bar, sql editor
paste in create command
green run button
success, no rows returned
go back to table editor and it's there






*/


/*
previous ones:


CREATE TABLE table_settings (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL
);

CREATE TABLE table_counts (
	browser_tag CHAR(21) PRIMARY KEY,
	count BIGINT DEFAULT 0 NOT NULL
);

*/


/*
notes about the complete subset of types you'll use:

CHAR(21) for tags, using this means it's a tag, even, which is great
CHAR(52) for hashes, using this means it's a hash
TEXT for all other text, email, username, posts, comments, base62 encoded encrypted text
BIGINT for boolean 0,1; enum -1,0,1,2; tick counts; any actual numbers

(and that might be all!)
and then your existing checkTag(), checkText(), checkInt() are good for script and the database
all you have to do is add under max to checkInt

chatting about types generally:

sounds like TEXT is postgres-specific, use for everything
except when you know the exact length, like a CHAR(21) tag

Type: INTEGER, BIGINT
INTEGER: A 4-byte integer that supports values from -
BIGINT: An 8-byte integer that supports values from -
so use BIGINT for everything
these have to be integers, and can be negative

there is a BOOLEAN type
but instead just use BIGINT 0 or 1 to enable you to do a 2 later, maybe

taht might be it
you're intentionally avoiding date, duration, and uuid types
ARRAY and JSON are common; maybe you'll use those, or maybe you'll instead accomplish array-like data with simple tables with multiple rows



*/


/*
do a little section in tests and library about number ranges
javascript has max integer, and then BigInt
postgres has BIGINT, huge but much smaller you think that max int
in here for fun also show how big tick counts are these days, capacity of a hard drive, and so on

[~]probably bake into checkInt that it's an integer that fits in 8 bytes (which is still huge)
or make a separate one you use when thinking about integers that will go into the postgres database

[~]add Size.bits = 8 to document math you do with that

maybe []add check in checkInt to make sure in safe range, so at or under javascript's maximum

--nevermind! postgres bigint is bigger than js max safe integer
postgres bigint is -(2^63) through (2^63)-1; -9223372036854775808 to +9223372036854775807 says web documentation
javascript number is -(2^53) through (2^53)-1; The safe integers consist of all integers from -(253 - 1) to 253 - 1, inclusive (±9,007,199,254,740,991) says web documentation

export function checkInt8(i, minimum) {
	checkInt(i, minimum)//make sure it's an integer

}



* Checks if a given number fits within the PostgreSQL BIGINT range.
*
* @param {number} num - The number to check.
* @returns {boolean} - True if the number fits within the PostgreSQL BIGINT range, otherwise false.
function isSafeBigInt(num) {
// BIGINT is an 8-byte signed integer
const BYTE_SIZE = 8;
const BITS_PER_BYTE = 8;
const TOTAL_BITS = BYTE_SIZE * BITS_PER_BYTE;

// Calculate the range for a signed 8-byte integer
const BIGINT_MIN = -(2 ** (TOTAL_BITS - 1));
const BIGINT_MAX = (2 ** (TOTAL_BITS - 1)) - 1;

// Check if the number is an integer
if (!Number.isInteger(num)) {
return false;
}

// Check if the number fits within the BIGINT range
return num >= BIGINT_MIN && num <= BIGINT_MAX;
}

// Example usage:
console.log(isSafeBigInt(123456789012345)); // true
console.log(isSafeBigInt(-123456789012345)); // true
console.log(isSafeBigInt(9223372036854775807)); // true
console.log(isSafeBigInt(9223372036854775808)); // false
console.log(isSafeBigInt(-9223372036854775809)); // false
console.log(isSafeBigInt(123.456)); // false
console.log(isSafeBigInt('123456789012345')); // false, not a number

*/


/*
make sure postgresql has the default utf-8 character encoding with a sql statement like this:

SELECT pg_encoding_to_char(encoding) AS encoding
FROM pg_database
WHERE datname = current_database()

ran this in supabase's sql editor, and the result is "UTF8"
*/





// Four functions for the row 'count_global' in table 'table_settings'

// 1. Determine if the row exists
export async function rowExists() {
	// SQL equivalent: SELECT COUNT(key) FROM table_settings WHERE key = 'count_global'
	let { data, error, count } = await supabase
		.from('table_settings').select('key', { count: 'exact' }).eq('key', 'count_global')
	if (error) toss('supabase', {error})
	return count > 0
}

// 2. Create the row with starting value zero
export async function createRow() {
	// SQL equivalent: INSERT INTO table_settings (key, value) VALUES ('count_global', '0')
	let { data, error } = await supabase
		.from('table_settings').insert([{ key: 'count_global', value: '0' }])
	if (error) toss('supabase', {error})
}

// 3. Read the value
export async function readRow() {
	// SQL equivalent: SELECT value FROM table_settings WHERE key = 'count_global'
	let { data, error } = await supabase
		.from('table_settings').select('value').eq('key', 'count_global')
	if (error) toss('supabase', {error})
	return data[0]?.value
}

// 4. Write a new value
export async function writeRow(newValue) {
	// SQL equivalent: UPDATE table_settings SET value = 'newValue' WHERE key = 'count_global' RETURNING *
	let { data, error } = await supabase
		.from('table_settings').update({ value: newValue }).eq('key', 'count_global').select()
	if (error) toss('supabase', {error})
	if (!data.length) toss('no error from update, but also no updated rows')
}






/*
confirm that crazy unicode text like from instagram:
♦✎  𝓕𝔢βᖇǗ𝔞𝐑𝕪  🐸♔
can make it way all the way into the database and back up again
just code the user's note box that's stored in the database
*/

let nonsense = '♦✎  𝓕𝔢βᖇǗ𝔞𝐑𝕪  🐸♔'





//global password account access design notes
/*

browsers are identified by their browser hash
that hash can be signed in or not

the table should always grow: rows are added, not edited
in addition to use specific information, rows generally always include a
row number, what you get from supabase or postgres by default
tag for unique identification
tick when the row was made

maybe this is all you need:

rownumber | tag      | tick   | browserhash | sign in or sign out
						CHAR(21)   BIGINT   CHAR(52)      BIGINT


making in the supabase dashboard
table_access, name
turned off row level security
two fields are already in there:
id, int8, maybe this is rownumber
created_at, timestamptz, now(), looks like an automatic tick stamp but not sure format or granularity
leaving those in and adding your own, even if there's some duplication

and talking to chat as you go
turning off rls is fine, and common when server code has exclusive access to the database
supabase's int8 is postgres BIGINT
checking primary key tells PostgreSQL that this column will uniquely identify each row in the table
PostgreSQL automatically creates an index on the primary key to ensure that lookups are fast.

Type: "timestamptz" (timestamp with time zone)

ok, chatting more here's the consensus:
-totally fine to keep RLS off, despite supabase warnings
-a table can only have one primary key, which has to be unique (advanced thing called composite key is the exception to this rule)
-postgres will build an index for that primary key, making lookups fast
-advanced thing called indexes like CREATE INDEX idx_user_id ON posts (user_id)
-also "While PostgreSQL’s query planner is quite sophisticated and can optimize queries using existing indexes, it won’t create new indexes on its own based on query usage."

so, use this as an excuse to at this early stage, make things simpler
rownumber is in there, and it's the primary key, but you ignore it
tag and tick get sent together from the worker, ignore timestampz and supabase's clock

rownumber | tag      | tick   | browserhash | sign in or sign out
						CHAR(21)   BIGINT   CHAR(52)      BIGINT


-row number: an automatically incrementing number that the database handles itself
-tag: CHAR(21), globally unique, set by my code
-tick: BIGINT, set by my code
-browser hash: CHAR(52), set by my code
-signed in: BIGINT, ill store 0 or 1 here to use that as a boolean


CREATE TABLE table_access (
	row_number BIGSERIAL PRIMARY KEY,
	tick BIGINT NOT NULL,
	tag CHAR(21) UNIQUE NOT NULL,
	browser_hash CHAR(52) NOT NULL,
	signed_in BIGINT NOT NULL
);

BIGSERIAL is 8 byte, and auto incrementing
it's standard to set this as the primary key, even if tag is also globally unique, picking that for now
there doesn't seem to be a way to get Date.now() easily in postgres, so we'll do that in the worker
*/

/*
next day
having some problems in supabase with the automatic row numbers
so, abandoning that
in excel and on a piece of paper, the rows have an order, but this isn't the case in postgres

picking tag as the primary key
it's guaranteed to be unique in the table and everywhere because it's a tag
you'll never sort or lookup by tag, and postgres will be ready to make that fast if you ever did, but that's ok

tick is when, according to the worker, the new row was inserted
you're thinking all your tables will start tag and tick like this

the common query is to filter by browser hash, and look at results sorted by tick
the index below makes this fast
postgres won't create this index automatically, but will use it automatically, looking at your query

CREATE TABLE table_access (
	tag CHAR(21) PRIMARY KEY NOT NULL, -- row identifier, globally unique, primary key
	tick BIGINT NOT NULL,              -- tick when record inserted
	browser_hash CHAR(52) NOT NULL,  -- Browser identifier used for filtering
	signed_in BIGINT NOT NULL  -- Boolean-like integer indicating signed-in status (e.g., 0 or 1)
);

CREATE INDEX idx_browser_hash_tick ON table_access (browser_hash, tick);

Ok to name the index index_browser_tick? Do these names need to be unique across my whole database, or are they specific to the table they're on?
OK, but then imagine I've got another table which also needs an index that filters by browser and sorts by tick. Shouldn't I include that table name in the index name if they must all be unique?

index_access_browser_tick




*/

//insert a new row into table_access with the given row tag, browser hash, and signed in status
export async function accessInsert(browser_tag, signed_in) {
	checkTag(browser_tag)//put type checks here, you think, to be sure only good data gets inserted
	checkInt(signed_in)
	let { data, error } = await supabase
		.from('access_table')
		.insert([{ row_tick: Now(), row_tag: Tag(), browser_tag, signed_in }])
	if (error) toss('supabase', {error})
}
//query table_access to get all the rows with a matching browser_tag
export async function accessQuery(browser_tag) {
	let { data, error } = await supabase
		.from('access_table')
		.select('*')
		.eq('browser_tag', browser_tag)
		.order('row_tick', { ascending: false })//most recent row first
	if (error) toss('supabase', {error})
	return data
}





/*
long chat about transactions that ended up with this

const sql = `
	BEGIN;
	INSERT INTO first_table (column) VALUES (quote_literal(${val1}));
	INSERT INTO second_table (column) VALUES (quote_literal(${val2}));
	COMMIT;
`
const { data, error } = await supabase.rpc('execute_sql', { sql })

imagine the database only makes sense when both, or neither of these rows are added
if one row is added, and the other one not there, the database isn't in a consistent state

also, imagine the first row inserts fine, but then
a valid error correctly prevents the second row from being inserted
there could be a uniqueness conflict on the second row, for instance

using the supabase api, each insert is a separate statement
js code will have to notice the error on the second insert
and then go back and try to remove the first

but this problem was solved in databases decades ago!
with somethign called the transaction
the begin and commit lines above group the two inserts into a single transaction
and, sure enough, if there's a problem anywhere in there, none of it sticks
and all of this is automatic

so you want to be able to use transactions
the problem is, the supabase api doesn't include them
there isn't a way to do two inserts in a single call to the supabase api, either
even with all the method chaining

so the plan is to
use the supabase api for reads
and individual writes
but when you need to insert multiple rows all at once
to drop down to raw sql and execute a block like above

but now you need to worry about the infamous sql injection attack
but maybe it's not too hard
you think essentially you just have to validate the inserts really well
and your own functions are doing this

but additionally, get protection from using knex, continued below
(that didn't work because they all assume api or node, rerouting)

also, batch raw inserts like this also will likely be faster,
as each trip to supabase is taking ~150ms
*/









