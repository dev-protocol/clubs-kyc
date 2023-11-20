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
import { always } from 'ramda'

type RequestBody = ReadonlyDeep<{
	payload?: {
		status?: string
		identityVerificationId?: string
	}
}>

export const POST: APIRoute = async ({ request, clientAddress }) => {
	console.log('Request headers', Object.fromEntries(request.headers))
	console.log('IP address', clientAddress)

	const body = await request
		.json()
		.then((x) => x as RequestBody)
		.catch((err) => new Error(err))

	console.log('Request body', body)

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

	const result = await whenNotErrorAll(
		[props, db, isValidRequest],
		async ([data, client]) => {
			/**
			 * Fetch the record with the matching idv
			 */
			const records = await client.ft.search(
				'id:user',
				`@ondatoVerificationId:${data.idv}`,
			)

			console.log({ records })

			/**
			 * Loop through each and update the status
			 */
			const updateStatus = await whenNotError(records, async (_records) => {
				const promises = _records.documents.map((record) => {
					const updatedRecord = {
						...record.value,
						status: data.status,
					}
					return client.json.set(record.id, '$', updatedRecord)
				})

				return await Promise.all(promises)
			})

			console.log({ updateStatus })

			const quit = await client.quit().catch((err) => new Error(err))

			console.log({ quit })

			return whenNotErrorAll([updateStatus, quit], always(true))
		},
	)

	console.log({ result, body, isValidRequest, db, props })

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
