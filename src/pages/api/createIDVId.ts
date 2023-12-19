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

type KYCStatus = Readonly<{
	status: string
	ondatoVerificationId: string
	ondatoExternalReferenceId: string
	address: string
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

	// Fetch db.
	const db = await whenNotErrorAll([userAddress, params], always(redis()))

	// Check for previous kyc status.
	// **NOTE: true if request is valid (i.e kyc not in process already). Error other wise**
	const isEligibleForNewIdvid: true | Error = await whenNotErrorAll(
		[userAddress, db],
		([_userAddress, _db]) =>
			whenDefinedAll([_userAddress, _db], async ([_address, _d]) => {
				const recordKey = `user:${_address}`
				const kycStatus = await _d.json
					.get(recordKey)
					.then((res) => res as KYCStatus)
					.catch((err) => new Error(err))

				return kycStatus &&
					(kycStatus instanceof Error ||
						kycStatus.status === 'Completed' ||
						kycStatus.status === 'Approved')
					? new Error(
							kycStatus instanceof Error ? kycStatus.message : 'KYC in process',
						)
					: true
			}) ?? new Error('Could not fetch user status'),
	)

	// GET Ondato access token.
	const accessToken = await whenNotErrorAll(
		[userAddress, isEligibleForNewIdvid],
		([_userAddress]) =>
			whenDefined(_userAddress, (_address) => getAccessToken(_address)) ??
			new Error('Try again later'),
	)

	// Get ondato idvid for url generation.
	const idvId = await whenNotErrorAll(
		[userAddress, accessToken, isEligibleForNewIdvid],
		([_userAddress, _accessToken]) =>
			whenDefinedAll([_userAddress, _accessToken], ([_address, _token]) =>
				getIDVId(_token.access_token, _address),
			) ?? new Error('Invalid address or access token'),
	)

	const result = await whenNotErrorAll(
		[userAddress, idvId, db, isEligibleForNewIdvid],
		([_userAddress, _idvId, _db]) =>
			whenDefinedAll(
				[_userAddress, _idvId, _db],
				async ([_address, _id, _d]) => {
					const recordKey = `user:${_address}`
					const data = {
						address: _address,
						ondatoVerificationId: _id.id,
						ondatoExternalReferenceId: _id.externalReferenceId,
					}
					const res = await _d.json.set(recordKey, '$', data)
					const quit = await _d.quit().catch((err) => new Error(err))
					return whenNotErrorAll([res, quit], always(true))
				},
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

export const OPTIONS: APIRoute = async ({ request }: { request: Request }) => {
	return new Response(json({}), { status: request ? 200 : 400, headers })
}
