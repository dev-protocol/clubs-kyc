import type { APIRoute } from 'astro'
import { json } from 'utils/json'
import { headers } from 'utils/headers'
import {
	whenDefinedAll,
	whenNotError,
	whenNotErrorAll,
} from '@devprotocol/util-ts'
import { always } from 'ramda'
import type { ReadonlyDeep } from 'type-fest'
import { auth } from 'utils/auth'
import { redis } from 'utils/db'

type RequestBody = ReadonlyDeep<{
	x?: string
	y?: string
	z?: string
}>

export const POST: APIRoute = async ({ request, clientAddress }) => {
	console.log('Request headers', Object.fromEntries(request.headers))
	console.log('Request body', await request.json())
	console.log('IP address', clientAddress)

	const body = await request
		.json()
		.then((x) => x as RequestBody)
		.catch((err) => new Error(err))

	const props = whenNotError(
		body,
		(data) =>
			whenDefinedAll([data.x, data.y, data.z], ([x, y, z]) => ({
				x,
				y,
				z,
			})) ?? new Error('Missing a required data'),
	)

	const isValidRequest = auth(request)
		? true
		: new Error('Authentication failed')

	const db = await whenNotError(isValidRequest, always(redis()))

	const result = await whenNotErrorAll([db, props], ([client]) =>
		client.quit().catch((err) => new Error(err)),
	)

	console.log({ result })

	return new Response(
		result instanceof Error
			? json({ data: null, message: result.message })
			: json({ data: result, message: 'success' }),
		{
			status: result instanceof Error ? 400 : 200,
			headers,
		},
	)
}
