import { Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Group } from '../../api/types'
import { m } from '../../paraglide/messages'

export interface ClientRecord {
  id: string
  name: string
  description?: string
  redirectUri?: string[]
  groups?: {
    data: string[]
    hasMore: boolean
  }
  grantTypes?: string[]
  scopes?: string[]
  public?: boolean
  isSystem?: boolean
  consentRequired?: boolean
  applicationUrl: string,
  termsOfServiceUrl: string,
  privacyPolicyUrl: string,
  logoUrl: string,
  secrets?: {
    data: string[]
    hasMore: boolean
  }
}

export const getClientColumns = (
  allGroups: Group[],
  sortOrderByField?: {
    name?: 'ascend' | 'descend'
    public?: 'ascend' | 'descend'
  },
): ColumnsType<ClientRecord> => [
  {
    title: m.mainName(),
    dataIndex: 'name',
    key: 'name',
    sorter: true,
    sortOrder: sortOrderByField?.name,
    render: (value: string, record) => (
      <span>
        {value}
        {record.isSystem ? <Tag style={{ marginInlineStart: 8 }}>{m.mainSystem()}</Tag> : null}
      </span>
    ),
  },
  {
    title: m.clientsTableClientId(),
    dataIndex: 'id',
    key: 'id',
    render: (value: string) => (
      <Typography.Text type="secondary">{value}</Typography.Text>
    ),
  },
  {
    title: m.mainDescription(),
    dataIndex: 'description',
    key: 'description',
    render: (value: string | undefined) =>
      value ? value : <Typography.Text type="secondary">-</Typography.Text>,
  },
  {
    title: m.clientsTablePublic(),
    dataIndex: 'public',
    key: 'public',
    sorter: true,
    sortOrder: sortOrderByField?.public,
    render: (value: boolean | undefined) => (
      <Typography.Text type={value ? undefined : 'secondary'}>
        {value ? m.mainYes() : m.mainNo()}
      </Typography.Text>
    ),
  },
  {
    title: m.mainGroups(),
    dataIndex: 'groups',
    key: 'groups',
    render: (clientGroups: ClientRecord['groups']) => {
      const groupIds = clientGroups?.data ?? []
      if (groupIds.length === 0) {
        return <Typography.Text type="secondary">-</Typography.Text>
      }

      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {groupIds.map((groupIdOrName) => {
            const groupMatch = allGroups.find((group) => group.id === groupIdOrName)
            const displayName = groupMatch ? groupMatch.name : groupIdOrName

            return (
              <Tag color="blue" key={groupIdOrName}>
                {displayName}
              </Tag>
            )
          })}
        </div>
      )
    },
  },
]
