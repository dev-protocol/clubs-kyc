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
import { v4 as uuidv4 } from 'uuid'

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
		(_params) =>
			whenDefinedAll([_params.hash, _params.signature], ([hash, signature]) =>
				recoverAddress(hashMessage(hash), signature),
			) ?? new Error('Invalid request or missing data'),
	)

	// GET Ondato access token.
	const accessToken = await whenNotError(
		userAddress,
		(_userAddress) =>
			whenDefined(_userAddress, (_address) => getAccessToken(_address)) ??
			new Error('Try again later'),
	)
	// Get ondato idvid for url generation.
	const idvId = await whenNotErrorAll(
		[userAddress, accessToken],
		([_userAddress, _accessToken]) =>
			whenDefinedAll([_userAddress, _accessToken], ([_address, _token]) =>
				getIDVId(_token.access_token, _address),
			) ?? new Error('Invalid address or access token'),
	)

	// Save ondato idvid for url generation mapped with user address.
	const db = await whenNotErrorAll([userAddress, idvId], always(redis()))
	const result = whenNotErrorAll(
		[userAddress, idvId, db],
		([_userAddress, _idvId, _db]) =>
			whenDefinedAll(
				[_userAddress, _idvId, _db],
				async ([_address, _id, _d]) => {
					const recordKey = `user:${uuidv4()}`
					const data = {
						address: _address,
						ondatoVerificationId: _id.id,
					}
					return await _d.json.set(recordKey, '$', data)
				},
			) ?? Error('Could not get KYC verified, try again later!'),
	)

	console.log({ result })

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

export const OPTIONS: APIRoute = async ({ request }: { request: Request }) => {
	return new Response(json({}), { status: request ? 200 : 400, headers })
}
