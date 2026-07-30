import React from 'react'
import { Button, Card, Popconfirm, Table, Tag, Typography } from 'antd'
import type { ColumnsType, SorterResult } from 'antd/es/table/interface'
import type { ClientSecretRecord } from '../../api/clients/fetchClientSecrets'
import { m } from '../../paraglide/messages'

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
      title: m.clientSecretsPasswordHint(),
      dataIndex: 'passwordHint',
      key: 'passwordHint',
      render: (value: string | null | undefined, record) => (
        <span>
          {value ? value : <Typography.Text type="secondary">-</Typography.Text>}
          {record.isSystem ? <Tag style={{ marginInlineStart: 8 }}>{m.mainSystem()}</Tag> : null}
        </span>
      ),
    },
    {
      title: m.clientSecretsTableExpiresAt(),
      dataIndex: 'expirationDateTime',
      key: 'expirationDateTime',
      sorter: true,
      sortOrder: sortOrderByField?.expirationDateTime,
      render: (value: string | null | undefined) =>
        value ? value : <Typography.Text type="secondary">{m.clientSecretsNever()}</Typography.Text>,
    },
    ...(onDelete
      ? [
          {
            title: '',
            key: 'actions',
            width: 1,
            render: (_: unknown, record: ClientSecretRecord) => (
              <Popconfirm
                title={m.clientSecretsDeleteQuestion()}
                description={m.mainDeletionPermanent()}
                okText={m.mainDelete()}
                okButtonProps={{ danger: true }}
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
