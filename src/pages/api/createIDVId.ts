import { json } from 'utils/json'
import type { APIRoute } from 'astro'
import { headers } from 'utils/headers'
import {
	whenDefined,
	whenDefinedAll,
	whenNotError,
	whenNotErrorAll,
} from '@devprotocol/util-ts'
import { hashMessage, recoverAddress } from 'ethers'

import { getIDVId } from 'utils/getIDVId'
import { getAccessToken } from 'utils/getAccessToken'

type RequestBody = Readonly<{
	hash: string
	signature: string
}>

export const POST: APIRoute = async ({ request }: { request: Request }) => {
	const params = await request
		.json()
		.then((x) => x as RequestBody)
		.catch((err) => new Error(err))

	const userAddress = whenNotError(
		params,
		(params) =>
			whenDefinedAll([params.hash, params.signature], ([hash, signature]) =>
				recoverAddress(hashMessage(hash), signature),
			) ?? new Error('Invalid request or missing data'),
	)

	const accessToken = await whenNotError(
		userAddress,
		(userAddress) =>
			whenDefined(userAddress, (userAddress) => getAccessToken(userAddress)) ??
			new Error('Try again later'),
	)
	const idvId = await whenNotErrorAll(
		[userAddress, accessToken],
		([userAddress, accessToken]) =>
			whenDefinedAll([userAddress, accessToken], ([userAddress, accessToken]) =>
				getIDVId(accessToken.access_token, userAddress),
			) ?? new Error('Invalid address or access token'),
	)

	return new Response(
		idvId instanceof Error
			? json({ data: null, message: idvId })
			: json({ data: idvId, message: 'success' }),
		{
			status: idvId instanceof Error ? 400 : 200,
			headers,
		},
	)
}
