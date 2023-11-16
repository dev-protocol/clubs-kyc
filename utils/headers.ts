export const json = {
	'content-type': 'application/json;charset=UTF-8',
}

export const cors = {
	'access-control-allow-origin': '*',
	'Access-Control-Allow-Headers': 'Content-Type',
}

export const headers = {
	...json,
	...cors,
}
