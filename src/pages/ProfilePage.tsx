import { Descriptions, Result, Space, Spin, Tag, Typography } from 'antd'
import { useUser } from '../hooks/useUser'

const formatGrantType = (grantType: string) =>
  grantType
    .split('_')
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ')

const renderValue = (value: string | undefined) =>
  value?.trim() ? value : <Typography.Text type="secondary">-</Typography.Text>

const ProfilePage = () => {
  const { session, user, groups, displayName, isLoading, isAdmin } = useUser()

  const fullName =
    displayName ??
    (user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '')
  if (isLoading) {
    return (
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>Profile</Typography.Title>
        <Space><Spin /> <Typography.Text>Loading profile...</Typography.Text></Space>
      </Space>
    )
  }

  if (!session?.access_token_present) {
    return (
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>Profile</Typography.Title>
        <Result
          status="warning"
          title="No active session"
          subTitle="Sign in to view your profile information."
        />
      </Space>
    )
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            {fullName || user?.username || 'Profile'}
          </Typography.Title>
          <Typography.Text type="secondary">
            {user?.email ?? session.email ?? user?.username ?? session.id}
          </Typography.Text>
        </div>
      </div>

      <Descriptions
        bordered
        column={{ xs: 1, sm: 1, md: 2 }}
        title="Account"
      >
        <Descriptions.Item label="User ID">{renderValue(user?.id ?? session.id)}</Descriptions.Item>
        <Descriptions.Item label="Username">{renderValue(user?.username)}</Descriptions.Item>
        <Descriptions.Item label="First name">{renderValue(user?.firstName)}</Descriptions.Item>
        <Descriptions.Item label="Last name">{renderValue(user?.lastName)}</Descriptions.Item>
        <Descriptions.Item label="Email">{renderValue(user?.email ?? session.email)}</Descriptions.Item>
        <Descriptions.Item label="Role">
          {isAdmin ? <Tag color="blue">Administrator</Tag> : <Tag>Standard user</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="Two-factor authentication">
          <Typography.Text type={user?.twoFaEnabled ? undefined : 'secondary'}>
            {user?.twoFaEnabled ? 'Enabled' : 'Disabled'}
          </Typography.Text>
        </Descriptions.Item>
      </Descriptions>

      <Descriptions
        bordered
        column={1}
        title="Access"
      >
        <Descriptions.Item label="Groups">
          {groups.length > 0 ? (
            <Space wrap size={[4, 4]}>
              {groups.map((group) => (
                <Tag color="blue" key={group.id}>
                  {group.name}
                </Tag>
              ))}
            </Space>
          ) : (
            <Typography.Text type="secondary">-</Typography.Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Grant types">
          {user?.grantTypes?.length ? (
            <Space wrap size={[4, 4]}>
              {user.grantTypes.map((grantType) => (
                <Tag key={grantType}>{formatGrantType(grantType)}</Tag>
              ))}
            </Space>
          ) : (
            <Typography.Text type="secondary">-</Typography.Text>
          )}
        </Descriptions.Item>
      </Descriptions>
    </Space>
  )
}

export default ProfilePage
