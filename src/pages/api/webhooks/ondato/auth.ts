const webhookCallerIP: string = import.meta.env.ONDATO_WEBHOOK_CALLER_IP ?? ''

const allowedIp = webhookCallerIP.split(',').map((v) => v.trim())

export const auth = (clientAddress: string): boolean => {
	return allowedIp.includes(clientAddress)
}
