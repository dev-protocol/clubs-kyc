import { createClient } from 'redis'
import { whenDefined } from '@devprotocol/util-ts'

import { json } from 'utils/json'
import { headers } from 'utils/headers'

type KYCStatus = Readonly<{
	status: string
}>

export const GET = async ({ request }: { request: Request }) => {
	const url = new URL(request.url)

	return (
		whenDefined(url.searchParams.get('address'), async (_address) => {
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

			const record = (await client.json.get(`user:${_address}`)) as KYCStatus

			return new Response(
				json({ data: { status: record?.status || 'Unverified' } }),
				{
					status: 200,
					headers,
				},
			)
		}) ??
		new Response(json({ data: null, message: 'address is required' }), {
			status: 400,
		})
	)
}
