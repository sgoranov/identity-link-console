import { Space, Typography } from 'antd'

const HomePage = () => {
  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={2} style={{ margin: 0 }}>
        Welcome back
      </Typography.Title>
      <Typography.Paragraph>
        You are signed in. From here we will manage OAuth/OIDC clients and user access.
      </Typography.Paragraph>
    </Space>
  )
}

export default HomePage
