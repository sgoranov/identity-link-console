import React from 'react';
import { Table, Card, Popconfirm, Button } from 'antd';
import { getUserColumns } from './UserTable.columns';
import type { UserRecord } from './UserTable.columns';
import type { Group } from "../../api/types.ts";
import type { SorterResult } from 'antd/es/table/interface';

interface UserTableProps {
  users: UserRecord[];
  availableGroups: Group[];
  userGroupsByUsername?: Record<string, Group[]>;
  isLoading: boolean;
  onEdit?: (user: UserRecord) => void;
  onDelete?: (user: UserRecord) => void;
  deletingId?: string | null;
  currentUserId?: string;
  onSortChange?: (sorter: SorterResult<UserRecord> | SorterResult<UserRecord>[]) => void;
  sortOrderByField?: {
    username?: 'ascend' | 'descend'
    email?: 'ascend' | 'descend'
  }
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  availableGroups,
  userGroupsByUsername,
  isLoading,
  onEdit,
  onDelete,
  deletingId,
  currentUserId,
  onSortChange,
  sortOrderByField,
}) => {
  // We pass the fetched groups into the column generator
  const columns = getUserColumns(
    availableGroups,
    userGroupsByUsername,
    onEdit,
    sortOrderByField,
  );

  const columnsWithDelete = onDelete
    ? columns.concat({
        title: '',
        key: 'actions',
        width: 1,
        render: (_: unknown, record: UserRecord) => (
          record.id === currentUserId ? null : (
            <Popconfirm
              title="Delete user?"
              description="This deletion is permanent."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => onDelete(record)}
            >
              <Button type="link" danger loading={deletingId === record.id}>
                Delete
              </Button>
            </Popconfirm>
          )
        ),
      })
    : columns;

  return (
    <Card styles={{ body: { padding: 0 } }}>
      <Table<UserRecord>
        dataSource={users}
        columns={columnsWithDelete}
        loading={isLoading}
        rowKey="id"
        pagination={false}
        scroll={{ x: 'max-content' }} // Crucial for small devices
        onChange={(_pagination, _filters, sorter) => {
          if (onSortChange) onSortChange(sorter)
        }}
      />
    </Card>
  );
};
