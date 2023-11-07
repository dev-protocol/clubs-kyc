import type { APIRoute } from 'astro'
import { json } from 'utils/json'
import { headers } from 'utils/headers'
import {
	whenDefinedAll,
	whenNotError,
	whenNotErrorAll,
} from '@devprotocol/util-ts'
import { always } from 'ramda'
import { auth } from 'utils/auth'
import { redis } from 'utils/db'
import { createClient } from 'redis'
import { v4 as uuidv4 } from 'uuid'

export const GET = async ({
	params: { address },
}: {
	params: { address: string | undefined }
}) => {
	console.log('address is: ', address)

	// eslint-disable-next-line functional/no-conditional-statements
	if (!address) {
		console.log('address is: ', address)
		return new Response(json({ data: null, message: 'address is required' }), {
			status: 400,
		})
	}

	// const isValidRequest = auth(request)
	// 	? true
	// 	: new Error('Authentication failed')

	// const db = await whenNotError(isValidRequest, always(redis()))

	console.log(process.env.REDIS_URL)
	console.log(process.env.REDIS_USERNAME)
	console.log(process.env.REDIS_PASSWORD)

	const client = createClient({
		url: process.env.REDIS_URL,
		username: process.env.REDIS_USERNAME ?? '',
		password: process.env.REDIS_PASSWORD ?? '',
		socket: {
			keepAlive: 1,
			reconnectStrategy: 1,
		},
	})
	await client.connect()

	const recordKey = uuidv4()

	const testData = {
		address,
		ondatoVerificationId: 'abc',
		status: 'test',
	}

	await client.hSet(recordKey, testData)
	await client.hSet('index:address', address, recordKey)

	await client.quit()

	// {
	// 	'$.address': {
	// 		type: SchemaFieldTypes.TEXT,
	// 		SORTABLE: true,
	// 		AS: 'address'
	// 	},
	// 	'$.ondatoVerificationId': {
	// 		type: SchemaFieldTypes.TEXT,
	// 		AS: 'ondatoVerificationId'
	// 	},
	// 	'$.status': {
	// 		type: SchemaFieldTypes.TEXT,
	// 		AS: 'status'
	// 	}
	// }

	return new Response(json({ data: 'it works', message: 'success' }), {
		status: 200,
		headers,
	})

	// console.log('Request headers', Object.fromEntries(request.headers))
	// console.log('Request body', await request.json().catch((err) => err))
	// console.log('IP address', clientAddress)

	// const body = await request
	// 	.json()
	// 	.then((x) => x as RequestBody)
	// 	.catch((err) => new Error(err))

	// const props = whenNotError(
	// 	body,
	// 	(data) =>
	// 		whenDefinedAll([data.x, data.y, data.z], ([x, y, z]) => ({
	// 			x,
	// 			y,
	// 			z,
	// 		})) ?? new Error('Missing a required data'),
	// )

	// const isValidRequest = auth(request)
	// 	? true
	// 	: new Error('Authentication failed')

	// const db = await whenNotError(isValidRequest, always(redis()))

	// const result = await whenNotErrorAll([db, props], ([client]) =>
	// 	client.quit().catch((err) => new Error(err)),
	// )

	// console.log({ result })

	// return new Response(
	// 	result instanceof Error
	// 		? json({ data: null, message: result.message })
	// 		: json({ data: result, message: 'success' }),
	// 	{
	// 		status: result instanceof Error ? 400 : 200,
	// 		headers,
	// 	},
	// )
}
