import React from 'react'
import { Button, Card, Popconfirm, Table, Typography } from 'antd'
import type { ColumnsType, SorterResult } from 'antd/es/table/interface'
import type { ClientSecretRecord } from '../../api/clients/fetchClientSecrets'

interface ClientSecretsTableProps {
  secrets: ClientSecretRecord[]
  isLoading: boolean
  onDelete?: (secret: ClientSecretRecord) => void
  deletingId?: string | null
  onSortChange?: (sorter: SorterResult<ClientSecretRecord> | SorterResult<ClientSecretRecord>[]) => void
  sortOrderByField?: {
    expirationDateTime?: 'ascend' | 'descend'
  }
}

export const ClientSecretsTable: React.FC<ClientSecretsTableProps> = ({
  secrets,
  isLoading,
  onDelete,
  deletingId,
  onSortChange,
  sortOrderByField,
}) => {
  const columns: ColumnsType<ClientSecretRecord> = [
    {
      title: 'Password Hint',
      dataIndex: 'passwordHint',
      key: 'passwordHint',
      render: (value: string | null | undefined) =>
        value ? value : <Typography.Text type="secondary">-</Typography.Text>,
    },
    {
      title: 'Expires At',
      dataIndex: 'expirationDateTime',
      key: 'expirationDateTime',
      sorter: true,
      sortOrder: sortOrderByField?.expirationDateTime,
      render: (value: string | null | undefined) =>
        value ? value : <Typography.Text type="secondary">Never</Typography.Text>,
    },
    ...(onDelete
      ? [
          {
            title: '',
            key: 'actions',
            width: 1,
            render: (_: unknown, record: ClientSecretRecord) => (
              <Popconfirm
                title="Delete secret?"
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
          },
        ]
      : []),
  ]

  return (
    <Card styles={{ body: { padding: 0 } }}>
      <Table<ClientSecretRecord>
        dataSource={secrets}
        columns={columns}
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
