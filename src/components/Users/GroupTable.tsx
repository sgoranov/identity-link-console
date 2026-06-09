import React from 'react'
import { Button, Card, Popconfirm, Table, Tag } from 'antd'
import type { ColumnsType, SorterResult } from 'antd/es/table/interface'
import type { Group } from '../../api/types'

interface GroupTableProps {
  groups: Group[]
  isLoading: boolean
  onEdit?: (group: Group) => void
  onDelete?: (group: Group) => void
  onDeleteOpenChange?: (group: Group, open: boolean) => void
  deletingId?: string | null
  groupUserCounts?: Record<string, { count: number; hasMore: boolean }>
  groupUserCountsLoading?: Record<string, boolean>
  onSortChange?: (sorter: SorterResult<Group> | SorterResult<Group>[]) => void
  sortOrderByField?: {
    name?: 'ascend' | 'descend'
  }
}

export const GroupTable: React.FC<GroupTableProps> = ({
  groups,
  isLoading,
  onEdit,
  onDelete,
  onDeleteOpenChange,
  deletingId,
  groupUserCounts,
  groupUserCountsLoading,
  onSortChange,
  sortOrderByField,
}) => {
  const columns: ColumnsType<Group> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      sortOrder: sortOrderByField?.name,
      render: (value: string, record: Group) => (
        <span>
          {value}
          {record.isSystem ? <Tag style={{ marginInlineStart: 8 }}>System</Tag> : null}
        </span>
      ),
    },
    ...(onEdit
      ? [
          {
            title: '',
            key: 'actions',
            width: 1,
            render: (_: unknown, record: Group) => (
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  type="link"
                  disabled={Boolean(record.isSystem)}
                  onClick={() => onEdit(record)}
                >
                  Edit
                </Button>
                {onDelete ? (
                  (() => {
                    const countInfo = groupUserCounts?.[record.id]
                    const suffix = countInfo?.hasMore ? '+' : ''
                    const countText = countInfo
                      ? `${countInfo.count}${suffix}`
                      : '0'
                    const isLoadingCount = groupUserCountsLoading?.[record.id]
                    const usageText = isLoadingCount
                      ? 'Checking usage...'
                      : countInfo
                        ? `This group is assigned to ${countText} users.`
                        : 'This group is not assigned to any users.'

                    return (
                      <Popconfirm
                        title="Delete group?"
                        description={`This deletion is permanent. ${usageText}`}
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        onOpenChange={(open) => {
                          if (record.isSystem) return
                          if (onDeleteOpenChange) onDeleteOpenChange(record, open)
                        }}
                        onConfirm={() => onDelete(record)}
                      >
                        <Button
                          type="link"
                          danger
                          disabled={Boolean(record.isSystem)}
                          loading={deletingId === record.id}
                        >
                          Delete
                        </Button>
                      </Popconfirm>
                    )
                  })()
                ) : null}
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <Card styles={{ body: { padding: 0 } }}>
      <Table<Group>
        dataSource={groups}
        columns={columns}
        loading={isLoading}
        rowKey="id"
        rowClassName={(record) => (record.isSystem ? 'system-entity-row' : '')}
        pagination={false}
        scroll={{ x: 'max-content' }}
        onChange={(_pagination, _filters, sorter) => {
          if (onSortChange) onSortChange(sorter)
        }}
      />
    </Card>
  )
}
