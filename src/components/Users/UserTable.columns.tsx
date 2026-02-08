import { Button, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {Group} from "../../api/types.ts";

export interface UserRecord {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  groups: {
    data: string[];
    hasMore: boolean;
  };
  grantTypes: string[];
}

export const getUserColumns = (
  allGroups: Group[],
  userGroupsByUsername?: Record<string, Group[]>,
  onEdit?: (user: UserRecord) => void,
  sortOrderByField?: {
    username?: 'ascend' | 'descend'
    email?: 'ascend' | 'descend'
  },
): ColumnsType<UserRecord> => [
  {
    title: 'Name',
    key: 'name',
    render: (_, record) => `${record.firstName} ${record.lastName}`,
  },
  {
    title: 'Username',
    dataIndex: 'username',
    key: 'username',
    sorter: true,
    sortOrder: sortOrderByField?.username,
  },
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
    sorter: true,
    sortOrder: sortOrderByField?.email,
  },
  {
    title: 'Groups',
    dataIndex: 'groups',
    key: 'groups',
    render: (_userGroups: UserRecord['groups'], record) => {
      const groupsForUser = userGroupsByUsername?.[record.username];
      const userGroupIds = _userGroups?.data ?? [];

      if (groupsForUser && groupsForUser.length > 0) {
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {groupsForUser.map((group) => (
              <Tag color="blue" key={group.id}>
                {group.name}
              </Tag>
            ))}
          </div>
        );
      }

      if (userGroupIds.length === 0) {
        return <Typography.Text type="secondary">-</Typography.Text>;
      }

      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {userGroupIds.map((groupIdOrName) => {
            const groupMatch = allGroups.find(g => g.id === groupIdOrName);
            const displayName = groupMatch ? groupMatch.name : groupIdOrName;

            return (
              <Tag color="blue" key={groupIdOrName}>
                {displayName}
              </Tag>
            );
          })}
        </div>
      );
    },
  },
  ...(onEdit
    ? [
        {
          title: '',
          key: 'actions',
          width: 1,
          render: (_: unknown, record: UserRecord) => (
            <Button type="link" onClick={() => onEdit(record)}>
              Edit
            </Button>
          ),
        },
      ]
    : []),
];
