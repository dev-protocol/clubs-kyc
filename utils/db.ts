import { whenNotError } from '@devprotocol/util-ts'
import { always } from 'ramda'
import { createClient } from 'redis'
import type { ReadonlyDeep } from 'type-fest'

const { REDIS_URL, REDIS_USERNAME, REDIS_PASSWORD } = import.meta.env

export const redis = (
	opts: ReadonlyDeep<{
		url?: string
		username?: string
		password?: string
	}> = {
		url: REDIS_URL,
		username: REDIS_USERNAME ?? '',
		password: REDIS_PASSWORD ?? '',
	},
) =>
	whenNotError(createClient(opts), (db) =>
		db
			.connect()
			.then(always(db))
			.catch((err) => new Error(err)),
	)
