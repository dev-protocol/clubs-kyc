import { SchemaFieldTypes } from 'redis'
import { createClient } from 'redis'
import dotenv from 'dotenv'

dotenv.config()

// eslint-disable-next-line functional/functional-parameters
const createRedisSchema = async () => {
	const schema = {
		'$.address': {
			type: SchemaFieldTypes.TEXT,
			SORTABLE: true,
			AS: 'address',
		},
		'$.ondatoVerificationId': {
			type: SchemaFieldTypes.TAG,
			AS: 'ondatoVerificationId',
		},
		'$.ondatoExternalReferenceId': {
			type: SchemaFieldTypes.TAG,
			AS: 'ondatoExternalReferenceId',
		},
		'$.status': {
			type: SchemaFieldTypes.TEXT,
			AS: 'status',
		},
	}

	const client = createClient({
		// eslint-disable-next-line no-undef
		url: process.env.REDIS_URL,
		// eslint-disable-next-line no-undef
		username: process.env.REDIS_USERNAME ?? '',
		// eslint-disable-next-line no-undef
		password: process.env.REDIS_PASSWORD ?? '',
		socket: {
			keepAlive: 1,
			reconnectStrategy: 1,
		},
	})
	await client.connect()

	// eslint-disable-next-line functional/no-try-statements
	try {
		const indexCreated = await client.ft.create('id:user', schema, {
			ON: 'JSON',
			PREFIX: 'user:',
		})

		// eslint-disable-next-line functional/no-conditional-statements
		if (indexCreated === 'OK') {
			// eslint-disable-next-line functional/no-expression-statements, no-undef
			console.log('Schema created')
		}
	} catch (error) {
		// eslint-disable-next-line functional/no-expression-statements, no-undef
		console.log(error)
	}
	await client.quit()
	return
}

createRedisSchema()
