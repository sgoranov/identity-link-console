import React from 'react'
import { Button, Card, Popconfirm, Table } from 'antd'
import { getClientColumns } from './ClientTable.columns'
import type { ClientRecord } from './ClientTable.columns'
import type { Group } from '../../api/types'
import type { SorterResult } from 'antd/es/table'

interface ClientTableProps {
  clients: ClientRecord[]
  availableGroups: Group[]
  isLoading: boolean
  onViewSecrets?: (client: ClientRecord) => void
  onEdit?: (client: ClientRecord) => void
  onDelete?: (client: ClientRecord) => void
  deletingId?: string | null
  onSortChange?: (sorter: SorterResult<ClientRecord> | SorterResult<ClientRecord>[]) => void
  sortOrderByField?: {
    name?: 'ascend' | 'descend'
    public?: 'ascend' | 'descend'
  }
}

export const ClientTable: React.FC<ClientTableProps> = ({
  clients,
  availableGroups,
  isLoading,
  onViewSecrets,
  onEdit,
  onDelete,
  deletingId,
  onSortChange,
  sortOrderByField,
}) => {
  const columns = getClientColumns(availableGroups, sortOrderByField)

  const actionColumns = []

  if (onViewSecrets) {
    actionColumns.push({
      title: '',
      key: 'secrets',
      width: 1,
      render: (_: unknown, record: ClientRecord) => (
        <Button type="link" onClick={() => onViewSecrets(record)}>
          Secrets
        </Button>
      ),
    })
  }

  if (onEdit) {
    actionColumns.push({
      title: '',
      key: 'edit',
      width: 1,
      render: (_: unknown, record: ClientRecord) => (
        <Button type="link" onClick={() => onEdit(record)}>
          Edit
        </Button>
      ),
    })
  }

  if (onDelete) {
    actionColumns.push({
      title: '',
      key: 'delete',
      width: 1,
      render: (_: unknown, record: ClientRecord) => (
        <Popconfirm
          title="Delete client?"
          description="This deletion is permanent."
          okText="Delete"
          okButtonProps={{ danger: true }}
          onConfirm={() => onDelete(record)}
        >
          <Button type="link" danger loading={deletingId === record.id}>
            Delete
          </Button>
        </Popconfirm>
      ),
    })
  }

  const columnsWithActions = actionColumns.length > 0
    ? columns.concat(actionColumns)
    : columns

  return (
    <Card styles={{ body: { padding: 0 } }}>
      <Table<ClientRecord>
        dataSource={clients}
        columns={columnsWithActions}
        loading={isLoading}
        rowKey="id"
        pagination={false}
        scroll={{ x: 'max-content' }}
        onChange={(_pagination, _filters, sorter) => {
          if (onSortChange) onSortChange(sorter)
        }}
      />
    </Card>
  )
}
