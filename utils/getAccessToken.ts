import fetch from 'node-fetch'

type OndatoResponseType = Readonly<{
	scope: string
	expires_in: number
	token_type: string
	access_token: string
}>

// TODO: save this in the db to avoid issuing new token when a token is valid for 24 hrs.
export const getAccessToken = async (
	userAddress: string,
): Promise<Error | OndatoResponseType> => {
	const url = `${import.meta.env.API_URL}/connect/token`
	const headers = {
		'Content-Type': 'application/x-www-form-urlencoded',
	}
	const body = new URLSearchParams({
		grant_type: 'client_credentials',
		client_id: import.meta.env.CLIENT_ID,
		client_secret: import.meta.env.CLIENT_SECRET,
		scope: 'idv_api kyc_identifications_api',
	})

	// If user address not found, do not query for access token.
	return !userAddress
		? new Error('Missing data')
		: await fetch(url, {
				method: 'POST',
				headers,
				body: body,
			})
				.then((res) => res.json())
				.then((res) => res as OndatoResponseType)
				.catch((error) => new Error(error))
}
