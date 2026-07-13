import { Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Group } from '../../api/types'

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
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    sorter: true,
    sortOrder: sortOrderByField?.name,
    render: (value: string, record) => (
      <span>
        {value}
        {record.isSystem ? <Tag style={{ marginInlineStart: 8 }}>System</Tag> : null}
      </span>
    ),
  },
  {
    title: 'Client ID',
    dataIndex: 'id',
    key: 'id',
    render: (value: string) => (
      <Typography.Text type="secondary">{value}</Typography.Text>
    ),
  },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
    render: (value: string | undefined) =>
      value ? value : <Typography.Text type="secondary">-</Typography.Text>,
  },
  {
    title: 'Public',
    dataIndex: 'public',
    key: 'public',
    sorter: true,
    sortOrder: sortOrderByField?.public,
    render: (value: boolean | undefined) => (
      <Typography.Text type={value ? undefined : 'secondary'}>
        {value ? 'Yes' : 'No'}
      </Typography.Text>
    ),
  },
  {
    title: 'Groups',
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
