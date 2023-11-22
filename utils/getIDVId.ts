import fetch from 'node-fetch'
import { v4 as uuidv4 } from 'uuid'

type OndatoResponseType = Readonly<{
	id: string
}>

type ReturnType = Readonly<{
	id: string
	externalReferenceId: string
}>

export const getIDVId = async (
	accessToken: string,
	userAddress: string,
): Promise<Error | ReturnType> => {
	const url = `${import.meta.env.IDVID_API_URL}/v1/identity-verifications`
	const headers = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${accessToken}`,
	}
	const externalReferenceId = uuidv4()
	const body = JSON.stringify({
		externalReferenceId,
		registration: {
			address: userAddress,
		},
		setupId: import.meta.env.SETUP_ID,
	})

	// TODO: save this in the db to avoid issuing new token when a token is valid for 24 hrs.

	return await fetch(url, {
		method: 'POST',
		headers,
		body: body,
	})
		.then((res) => res.json())
		.then((res) => res as OndatoResponseType)
		.then((res) => ({ ...res, externalReferenceId }) as ReturnType)
		.catch((error) => new Error(error))
}
