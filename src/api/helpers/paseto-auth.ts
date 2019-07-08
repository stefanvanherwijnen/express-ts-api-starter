import bcrypt from "bcrypt"
import { Request } from "express"
import Paseto from "paseto.js"
import User from "../models/user"

import { JsonToken, Rules } from "paseto.js"

class PasetoAuth {
  public user: User
  public token: JsonToken
  public request: Request

  public constructor() {
    this.user = null
    this.token = null
  }

  /**
   * Generate aa token if the user exists
   * @param  {string}} credentials [description]
   * @return {Promise}              [description]
   */
  public async login(credentials: {email: string, password: string}): Promise<string|boolean> {
    this.user = await User.query().eager('roles').findOne("email", credentials.email)

    if (this.user && this.user.verified && this.validateByCredentials(credentials)) {
      const token = this.generateTokenForuser()
      return token
    }
    return false
  }

  /**
   * Check if the email and password are correct
   * @param  {string}} credentials [description]
   * @return {boolean}              [description]
   */
  public validateByCredentials(credentials: {email: string, password: string}): boolean {
    return bcrypt.compareSync(credentials.password, this.user.password)
  }

  /**
   * Check if the request has a valid token
   * @return {Promise<boolean>} [description]
   */
  public async check(): Promise<boolean> {
    let parser = new Paseto.Parser(await this.getSharedKey())

    parser = parser.addRule(new Rules.notExpired()).addRule(new Rules.issuedBy(this.getIssuer()))
    try {
      this.token = await parser.parse(this.getTokenFromRequest())
      const id = this.token.getClaims().id
      const user = await User.query().eager('roles').findById(id).throwIfNotFound()

      if (user) {
        this.user = user
      } else {
        return false
      }
    } catch (error) {
      return false
    }
    return true
  }

  /**
   * Create a token builder
   * @return {Promise<Paseto.Builder>} [description]
   */
  public async getTokenBuilder(): Promise<Paseto.Builder> {
    return new Paseto.Builder()
      .setPurpose("local")
      .setKey(await this.getSharedKey())
      .setExpiration(this.getExpireTime())
      .setIssuer(this.getIssuer())
  }

  public async generateTokenForuser(): Promise<string> {
    const claims = {
      id: this.user.id
    }
    const token = await this.getTokenBuilder()
    token.setClaims(claims)

    return await token.toString()
  }

  public async getSharedKey(): Promise<Paseto.SymmetricKey> {
    const sharedKey  = new Paseto.SymmetricKey(new Paseto.V2())

    return sharedKey.base64(process.env.PASETO_KEY).then((): Paseto.SymmetricKey => {
      return sharedKey
    })
  }

  public getExpireTime = (): Date => {
    let time = new Date()
    return new Date(time.setHours(time.getHours() + Number(process.env.PASETO_EXPIRE_AFTER_HOURS)))
  }

  public getIssuer = (): string => {
    return process.env.PASETO_ISSUER
  }

  public setRequest(request: Request): void {
    this.request = request
  }

  public getTokenFromRequest(): string {
    return this.request.header("Authorization").replace("Bearer ", "")
  }

  public async getUser(): Promise<User> {
    if (!this.user) {
      if (this.token) {
        const claims = this.token.getClaims()
        const user = await User.query().eager('roles').findById(claims.id).throwIfNotFound()
        this.user = user
        return user
      }
    } else {
      return this.user
    }
  }

  public async checkUserRole (role): Promise<boolean> {
    if (this.user) {
      const roles = await this.user.getRoles()
      if (roles.includes(role)) {
        return true
      }
    }
    return false
  }
}

export default new PasetoAuth()
