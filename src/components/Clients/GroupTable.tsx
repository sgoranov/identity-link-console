import React from 'react'
import { Button, Card, Popconfirm, Table, Tag } from 'antd'
import type { ColumnsType, SorterResult } from 'antd/es/table/interface'
import type { Group } from '../../api/types'
import { m } from '../../paraglide/messages'

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
      title: m.mainName(),
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      sortOrder: sortOrderByField?.name,
      render: (value: string, record: Group) => (
        <span>
          {value}
          {record.isSystem ? <Tag style={{ marginInlineStart: 8 }}>{m.mainSystem()}</Tag> : null}
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
                  {m.mainEdit()}
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
                      ? m.mainCheckingUsage()
                      : countInfo
                        ? m.clientGroupsAssignedToClients({ count: countText })
                        : m.clientGroupsNotAssignedToClients()

                    return (
                      <Popconfirm
                        title={m.groupsDeleteQuestion()}
                        description={m.groupsDeletionPermanentWithUsage({ usage: usageText })}
                        okText={m.mainDelete()}
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
                          {m.mainDelete()}
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
