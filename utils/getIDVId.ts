import fetch from 'node-fetch'

type OndatoResponseType = Readonly<{
	id: string
}>

export const getIDVId = async (
	accessToken: string,
	userAddress: string,
): Promise<Error | OndatoResponseType> => {
	const url = `${import.meta.env.IDVID_API_URL}/v1/identity-verifications`
	const headers = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${accessToken}`,
	}
	const body = JSON.stringify({
		externalReferenceId: `${Date.now()}:${userAddress}`,
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
		.catch((error) => new Error(error))
}
