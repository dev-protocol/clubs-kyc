import { json } from 'utils/json'
import type { APIRoute } from 'astro'
import { headers } from 'utils/headers'
import {
	whenDefined,
	whenDefinedAll,
	whenNotError,
	whenNotErrorAll,
} from '@devprotocol/util-ts'
import { always } from 'ramda'
import { hashMessage, recoverAddress } from 'ethers'

import { redis } from 'utils/db'
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

	// GET Ondato access token.
	const accessToken = await whenNotError(
		userAddress,
		(userAddress) =>
			whenDefined(userAddress, (userAddress) => getAccessToken(userAddress)) ??
			new Error('Try again later'),
	)
	// Get ondato idvid for url generation.
	const idvId = await whenNotErrorAll(
		[userAddress, accessToken],
		([userAddress, accessToken]) =>
			whenDefinedAll([userAddress, accessToken], ([userAddress, accessToken]) =>
				getIDVId(accessToken.access_token, userAddress),
			) ?? new Error('Invalid address or access token'),
	)

	// Save ondato idvid for url generation mapped with user address.
	const db = await whenNotErrorAll([userAddress, idvId], always(redis()))
	const result = whenNotErrorAll(
		[userAddress, idvId, db],
		([userAddress, idvId, db]) =>
			whenDefinedAll([userAddress, idvId, db], ([userAddress, idvId, db]) =>
				db.set(userAddress, idvId.id),
			) ?? Error('Could not get KYC verified, try again later!'),
	)

	return new Response(
		result instanceof Error
			? json({ data: null, message: result })
			: json({ data: idvId, message: 'success' }),
		{
			status: result instanceof Error ? 400 : 200,
			headers,
		},
	)
}
