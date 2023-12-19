import type { APIRoute } from 'astro'
import { json } from 'utils/json'
import { headers } from 'utils/headers'
import {
	whenDefinedAll,
	whenNotError,
	whenNotErrorAll,
} from '@devprotocol/util-ts'
import type { ReadonlyDeep } from 'type-fest'
import { auth } from './auth'
import { redis } from 'utils/db'
import { always } from 'ramda'

type RequestBody = ReadonlyDeep<{
	payload: {
		status: string
		identityVerificationId?: string
		externalReferenceId?: string
	}
	type: string
}>

export const POST: APIRoute = async ({ request, clientAddress }) => {
	const body = await request
		.json()
		.then((x) => x as RequestBody)
		.catch((err) => new Error(err))

	const isValidRequest = auth(clientAddress)
		? true
		: new Error('Authentication failed')

	const db = await redis()

	const props = whenNotError(
		body,
		(data) =>
			whenDefinedAll(
				[data.payload, data.type, data.payload.status],
				([payload, type, status]) => ({
					status: status,
					idv: payload.identityVerificationId,
					externalReferenceId: payload.externalReferenceId,
					type: type,
				}),
			) ?? new Error('Webhook payload params undefined'),
	)

	const result = await whenNotErrorAll(
		[props, db, isValidRequest],
		async ([data, client]) => {
			/**
			 * Fetch the record with the matching idv
			 */
			const records = await client.ft.search(
				'id:user',
				data.idv && data.idv !== '' // Use idv when defined, else use externalReferenceId
					? `@ondatoVerificationId:${data.idv}`
					: `@ondatoExternalReferenceId:${data.externalReferenceId}`,
			)

			// eslint-disable-next-line functional/no-expression-statements
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

			// eslint-disable-next-line functional/no-expression-statements
			console.log({ updateStatus })

			const quit = await client.quit().catch((err) => new Error(err))
			return whenNotErrorAll([updateStatus, quit], always(true))
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
