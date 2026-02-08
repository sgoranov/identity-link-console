import { useState, useMemo } from 'react'
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { Layout, Typography, Button, Space, Avatar, Grid, Menu, Drawer } from 'antd'
import { MenuOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons'
import { BFF_LOGOUT_URL } from '../auth/urls'
import { useUser } from '../hooks/useUser'
import styles from './RootLayout.module.scss'

const { useBreakpoint } = Grid

// New menu structure with nested items and icons
const menuConfig = [
  {
    key: 'users',
    label: 'Users',
    icon: <UserOutlined />,
    children: [
      { key: '/users', label: 'Users List' },
      { key: '/user-groups', label: 'User Groups' },
    ],
  },
  {
    key: 'clients',
    label: 'Clients',
    icon: <TeamOutlined />,
    children: [
      { key: '/clients', label: 'Clients List' },
      { key: '/client-groups', label: 'Client Groups' },
    ],
  },
]

const RootLayout = () => {
  const { user } = useUser()
  const { md } = useBreakpoint()
  const location = useLocation()
  const navigate = useNavigate()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const userInitial = user?.firstName?.[0] || 'G'
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Guest'

  // Determine the default open sub-menu based on the current URL path
  const defaultOpenKeys = useMemo(() => {
    for (const item of menuConfig) {
      if (item.children?.some((child) => child.key === location.pathname)) {
        return [item.key]
      }
    }
    return []
  }, [location.pathname])

  const handleMenuClick = (item: { key: string }) => {
    navigate({ to: item.key })
    setIsDrawerOpen(false)
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Header className={styles.header}>
        <Space size="large" style={{ flex: 1 }}>
          <Link to="/" style={{ color: 'inherit' }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              IdentityLink
            </Typography.Title>
          </Link>

          {/* DESKTOP MENU: Only shows on md and up */}
          {md && (
            <Menu
              mode="horizontal"
              selectedKeys={[location.pathname]}
              defaultOpenKeys={defaultOpenKeys}
              items={menuConfig}
              onClick={handleMenuClick}
              style={{ borderBottom: 0, minWidth: 350 }}
            />
          )}
        </Space>

        <Space size="middle">
          {!md && (
            <Button
              icon={<MenuOutlined />}
              type="text"
              onClick={() => setIsDrawerOpen(true)}
            />
          )}

          {md && <Typography.Text strong>{fullName}</Typography.Text>}
          <Avatar style={{ backgroundColor: '#1890ff' }}>{userInitial}</Avatar>

          {md && (
            <Button
              type="text"
              onClick={() => window.location.assign(BFF_LOGOUT_URL)}
            >
              Sign out
            </Button>
          )}
        </Space>
      </Layout.Header>

      {/* MOBILE DRAWER: Responsive menu */}
      <Drawer
        title="Menu"
        placement="right"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ padding: '16px' }}>
            <Typography.Text strong>{fullName}</Typography.Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={defaultOpenKeys}
          items={menuConfig}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
        <div style={{ position: 'absolute', bottom: 0, width: '100%', padding: '16px' }}>
          <Button
            block
            type="primary"
            ghost
            onClick={() => window.location.assign(BFF_LOGOUT_URL)}
          >
            Sign out
          </Button>
        </div>
      </Drawer>

      <Layout.Content className={styles.content}>
        <Outlet />
      </Layout.Content>
    </Layout>
  )
}

export default RootLayout
