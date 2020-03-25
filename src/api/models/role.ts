import { Model, RelationMappings } from 'objection'

import { Model as User } from './user'

import JsonSerializer from '~/api/helpers/json-serializer'

JsonSerializer.register('role', {
    jsonapiObject: false,
    whitelistOnDeserialize: ['id', 'name']
})

export default class Role extends Model {
    readonly id?: number
    name?: string

    static tableName = 'roles'

    static relationMappings = (): RelationMappings => ({
        user: {
            join: {
                from: 'roles.id',
                through: {
                    from: 'user_role.role_id',
                    to: 'user_role.user_id',
                },
                to: 'users.id',
            },
            modelClass: User,
            relation: Model.HasOneRelation,
        }
    }
    )
}
