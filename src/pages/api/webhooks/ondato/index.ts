import type { APIRoute } from 'astro'
import { json } from 'utils/json'
import { headers } from 'utils/headers'
import {
	whenDefinedAll,
	whenNotError,
	whenNotErrorAll,
} from '@devprotocol/util-ts'
import type { ReadonlyDeep } from 'type-fest'
import { auth } from 'utils/auth'
import { redis } from 'utils/db'
import { v4 as uuidv4 } from 'uuid'
import { always } from 'ramda'

type RequestBody = ReadonlyDeep<{
	payload?: {
		status?: string
		identityVerificationId?: string
	}
}>

export const POST: APIRoute = async ({ request, clientAddress }) => {
	console.log('Request headers', Object.fromEntries(request.headers))
	console.log('Request body', await request.json().catch((err) => err))
	console.log('IP address', clientAddress)

	const body = await request
		.json()
		.then((x) => x as RequestBody)
		.catch((err) => new Error(err))

	const isValidRequest = auth(request)
		? true
		: new Error('Authentication failed')

	const db = await redis()

	const props = whenNotError(
		body,
		(data) =>
			whenDefinedAll(
				[data.payload?.status, data.payload?.identityVerificationId],
				([status, idv]) => ({
					status,
					idv,
				}),
			) ?? new Error('Payload params undefined'),
	)

	/**
	 * gererate a unique key for the record
	 */
	const recordKey = uuidv4()

	const result = await whenNotErrorAll(
		[props, db, isValidRequest],
		async ([data, client]) => {
			/**
			 * set the record data in redis
			 */
			const setRecord = await client
				.hSet(recordKey, data)
				.catch((err) => new Error(err))

			/**
			 * set the index in redis
			 */
			const setIndex = await whenNotError(
				setRecord,
				always(client.hSet('index:ondatoVerificationId', data.idv, recordKey)),
			)
			const quit = await client.quit().catch((err) => new Error(err))

			return whenNotErrorAll([setIndex, quit], always(true))
		},
	)

	return result instanceof Error
		? new Response(json({ data: null, message: result.message }), {
				status: 401,
				headers,
		  })
		: new Response(json({ data: null, message: 'Success' }), {
				status: 200,
				headers,
		  })
}
