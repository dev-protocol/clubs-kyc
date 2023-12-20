import { createClient } from 'redis'
import { isNotError, whenDefined, whenNotErrorAll } from '@devprotocol/util-ts'

import { json } from 'utils/json'
import { headers } from 'utils/headers'

type KYCStatus = Readonly<{
	status: string
}>

export const GET = async ({ request }: { request: Request }) => {
	const url = new URL(request.url)

	return (
		whenDefined(url.searchParams.get('address'), async (_address: string) => {
			const client = createClient({
				url: process.env.REDIS_URL,
				username: process.env.REDIS_USERNAME ?? '',
				password: process.env.REDIS_PASSWORD ?? '',
				socket: {
					keepAlive: 1,
					reconnectStrategy: 1,
				},
			})
			// eslint-disable-next-line functional/no-expression-statements
			await client.connect()

			const record = (await client.json.get(`user:${_address}`)) as KYCStatus
			const quit = await client.quit().catch((err) => new Error(err))
			const result = whenNotErrorAll([record, quit], ([rec]) => rec)

			return new Response(
				json({
					data: {
						status:
							result && isNotError(result) && result.status
								? result.status.toLowerCase()
								: 'unverified',
					},
				}),
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
