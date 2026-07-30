import { Button, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {Group} from "../../api/types.ts";
import { m } from '../../paraglide/messages'

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
  isSystem?: boolean;
  twoFaEnabled?: boolean;
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
    title: m.mainName(),
    key: 'name',
    render: (_, record) => (
      <span>
        {record.firstName} {record.lastName}
        {record.isSystem ? <Tag style={{ marginInlineStart: 8 }}>{m.mainSystem()}</Tag> : null}
      </span>
    ),
  },
  {
    title: m.mainUsername(),
    dataIndex: 'username',
    key: 'username',
    sorter: true,
    sortOrder: sortOrderByField?.username,
  },
  {
    title: m.mainEmail(),
    dataIndex: 'email',
    key: 'email',
    sorter: true,
    sortOrder: sortOrderByField?.email,
  },
  {
    title: m.usersTableTwoFa(),
    dataIndex: 'twoFaEnabled',
    key: 'twoFaEnabled',
    render: (value: boolean | undefined) => (
      <Typography.Text type={value ? undefined : 'secondary'}>
        {value ? m.mainEnabled() : m.mainDisabled()}
      </Typography.Text>
    ),
  },
  {
    title: m.mainGroups(),
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
            <Button
              type="link"
              disabled={Boolean(record.isSystem)}
              onClick={() => onEdit(record)}
            >
              {m.mainEdit()}
            </Button>
          ),
        },
      ]
    : []),
];
