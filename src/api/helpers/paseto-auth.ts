import bcrypt from 'bcrypt'
import { Request } from 'express'
import paseto from 'paseto'
import { Model as User } from '../models/user'
import crypto from 'crypto'


const { V2: { encrypt, decrypt } } = paseto

class PasetoAuth {
  /**
  * Generate aa token if the user exists
   * @param user
   * @param credentials 
   * @return {Promise}
   */
  public async login (user, credentials: { email: string, password: string }): Promise<string | boolean> {
    if (user && this.validateByCredentials(user, credentials)) {
      const token = this.generateTokenForuser(user)
      return token
    }
    return false
  }

  /**
   * Check if the email and password are correct
   * @param user 
   * @param credentials 
   * @return {boolean}
   */
  public validateByCredentials (user, credentials: { email: string, password: string }): boolean {
    return bcrypt.compareSync(credentials.password, user.password)
  }

  /**
   * Check if the request has a valid token
   * @param req
   * @return {Promise<boolean>}
   */
  public async check (req: Request): Promise<boolean> {
    try {
      const key = crypto.createSecretKey(Buffer.from(process.env.PASETO_KEY, 'base64'))
      const payload = await decrypt(this.getTokenFromRequest(req), key, { issuer: process.env.PASETO_ISSUER })

      const id = payload.id
      const user = await User.query().eager('roles').findById(id).throwIfNotFound()
      const iat = payload.iat

      if (user) {
        if (user.tokensRevokedAt && (new Date(iat) < new Date(user.tokensRevokedAt))) {
          return false
        }
        Object.assign(req, { user: user })
      } else {
        return false
      }
    } catch (error) {
      return false
    }
    return true
  }

  /**
   * Generates an authorization token for an user
   * @param user
   * @returns {string}
   */
  public async generateTokenForuser (user): Promise<string> {
    const key = crypto.createSecretKey(Buffer.from(process.env.PASETO_KEY, 'base64'))
    const claims = {
      id: user.id
    }
    const token = await encrypt(claims, key, { expiresIn: process.env.PASETO_EXPIRE_AFTER_HOURS + 'hours', issuer: process.env.PASETO_ISSUER })

    return token
  }

  /**
   * Retrieve the authorization token from a request
   * @param req 
   * @returns {string}
   */
  public getTokenFromRequest (req): string {
    return req.header('Authorization').replace('Bearer ', '')
  }

  /**
   * Retrieve the authorized user for a request
   * @param req 
   * @returns {User}
   */
  public async getUser (req): Promise<User> {
    let user = req.user
    const token = req.token

    if (!user) {
      if (token) {
        const claims = token.getClaims()
        user = await User.query().eager('roles').findById(claims.id).throwIfNotFound()
        Object.assign(req, { user: user })

        return user
      }
    } else {
      return user
    }
  }

  /**
   * Check if the user belongs to a role
   * @param user 
   * @param role 
   * @returns {boolean}
   */
  public async checkUserRole (user, role): Promise<boolean> {
    if (user) {
      user = await user.$loadRelated('roles')
      if (user.roleNames.includes(role)) {
        return true
      }
    }
    return false
  }

  /**
   * Verify is the provided user matches the provided id
   * @param user 
   * @param id 
   * @param grantAccessTo 
   * @returns {boolean}
   */
  public async verifyUserId (user, id, grantAccessTo = null): Promise<boolean> {
    if (grantAccessTo) {
      for (const role of grantAccessTo) {
        if (await this.checkUserRole(user, role)) {
          return true
        }
      }
    }
    if (id && user && Number(user.id) === Number(id)) {
      return true
    } else {
      const error = new Error('Forbidden')
      error.statusCode = 403
      throw error
    }
  }
}

export default new PasetoAuth()
