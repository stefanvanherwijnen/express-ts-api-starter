import PasetoAuth from '~/api/helpers/paseto-auth'

export default async function (req, res, next): Promise<void> {
    if (req.header('Authorization') !== undefined) {
        const authorized = await PasetoAuth.check(req)
        if (authorized) {
            if (req.user.allowedIpAddresses) {
                const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
                if (req.user.allowedIpAddresses.includes(ip)) {
                    next()
                    return
                }
            } else {
                next()
                return
            }
        }
    }
    res.status(401).json({ errors: { title: 'Unauthorized' } })
}
