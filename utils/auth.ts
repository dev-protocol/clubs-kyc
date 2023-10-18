import { Buffer } from 'node:buffer'

const { BASIC_USERNAME, BASCI_PASSWORD } = import.meta.env
const requiredKey = Buffer.from(`${BASIC_USERNAME}:${BASCI_PASSWORD}`).toString(
	'base64',
)

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication#basic_authentication_scheme
export const auth = (req: Request): boolean => {
	const key = req.headers.get('authorization')?.replace(/Basic(\s)+/i, '')
	return key === requiredKey
}
