import type { APIRoute } from 'astro'
import { json } from 'utils/json'
import { headers } from 'utils/headers'
import { whenDefinedAll, whenNotErrorAll } from '@devprotocol/util-ts'
import type { ReadonlyDeep } from 'type-fest'
import { auth } from 'utils/auth'
import { redis } from 'utils/db'
import { v4 as uuidv4 } from 'uuid'

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

	return (
		whenNotErrorAll(
			[auth(request), await redis(), body],
			([, client, data]) =>
				whenDefinedAll(
					[data.payload?.status, data.payload?.identityVerificationId],
					async ([status, idv]) => {
						const data = {
							status,
							idv,
						}

						/**
						 * gererate a unique key for the record
						 */
						const recordKey = uuidv4()

						/**
						 * set the record data in redis
						 */
						// eslint-disable-next-line functional/no-expression-statements
						await client.hSet(recordKey, data)

						/**
						 * set the index in redis
						 */
						// eslint-disable-next-line functional/no-expression-statements
						await client.hSet('index:ondatoVerificationId', data.idv, recordKey)
						// eslint-disable-next-line functional/no-expression-statements
						await client.quit()

						return new Response(
							json({ data: null, message: 'Authentication failed' }),
							{ status: 200, headers },
						)
					},
				) ??
				new Response(
					json({ data: null, message: 'Payload params undefined' }),
					{
						status: 401,
						headers,
					},
				),
		) ??
		new Response(
			json({ data: null, message: 'Auth or redis or body parsing failed' }),
			{
				status: 401,
				headers,
			},
		)
	)
}
