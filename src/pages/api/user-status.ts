import { json } from 'utils/json'
import { headers } from 'utils/headers'
import { createClient } from 'redis'
import { whenDefined } from '@devprotocol/util-ts'

type User = Readonly<{
	address: string
	status: string
	ondatoVerificationId: string
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

			/**
			 * fetch user status based on address
			 */
			const recordKey = await client.hGet('index:address', _address)

			// eslint-disable-next-line functional/no-conditional-statements
			if (!recordKey) {
				return new Response(json({ data: null, message: 'not found' }), {
					status: 404,
				})
			}

			// get status and cast to UserStatus
			const user = (await client.hGetAll(recordKey)) as User

			await client.quit()

			return new Response(json({ user }), {
				status: 200,
				headers,
			})
		}) ??
		new Response(json({ data: null, message: 'address is required' }), {
			status: 400,
		})
	)
}
