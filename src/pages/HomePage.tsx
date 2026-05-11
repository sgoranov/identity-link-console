import { Space, Typography, Alert, Spin } from 'antd'
import { useUser } from '../hooks/useUser'

const HomePage = () => {
  const { isAdmin, isLoading } = useUser()

  if (isLoading) {
    return (
      <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={2} style={{ margin: 0 }}>
        Welcome back
      </Typography.Title>
      {isAdmin ? (
        <Typography.Paragraph>
          You are signed in as an administrator. From here we will manage OAuth/OIDC clients and user access.
        </Typography.Paragraph>
      ) : (
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          <Typography.Paragraph>
            You are signed in.
          </Typography.Paragraph>
          <Alert
            message="Restricted Access"
            description="You do not have administrative privileges. Only members of the administrator group can manage clients and users."
            type="info"
            showIcon
          />
        </Space>
      )}
    </Space>
  )
}

export default HomePage
