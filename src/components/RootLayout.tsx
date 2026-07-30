import { useState, useMemo } from 'react'
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { Layout, Typography, Button, Space, Avatar, Grid, Menu, Drawer, Select } from 'antd'
import { MenuOutlined, ProfileOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons'
import { BFF_LOGOUT_URL } from '../auth/urls'
import { useUser } from '../hooks/useUser'
import { m } from '../paraglide/messages'
import { getLocale, setLocale, type Locale } from '../paraglide/runtime'
import styles from './RootLayout.module.scss'

const { useBreakpoint } = Grid

const localeOptions: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'bg', label: 'Български' },
]

const RootLayout = () => {
  const { md } = useBreakpoint()
  const location = useLocation()
  const isPublicRoute = location.pathname === '/logout-success'
  const { user, displayName, isAdmin, isLoading } = useUser({ enabled: !isPublicRoute })
  const navigate = useNavigate()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [currentLocale, setCurrentLocale] = useState<Locale>(() => getLocale())
  const selectedMenuKey = location.pathname === '/profile' ? '/' : location.pathname

  const profileMenuItem = useMemo(
    () => ({
      key: '/',
      label: m.profileTitle(),
      icon: <ProfileOutlined />,
    }),
    [currentLocale],
  )

  const adminMenuConfig = useMemo(
    () => [
      {
        key: 'users',
        label: m.usersTitle(),
        icon: <UserOutlined />,
        children: [
          { key: '/users', label: m.layoutUsersList() },
          { key: '/user-groups', label: m.userGroupsTitle() },
        ],
      },
      {
        key: 'clients',
        label: m.clientsTitle(),
        icon: <TeamOutlined />,
        children: [
          { key: '/clients', label: m.layoutClientsList() },
          { key: '/client-groups', label: m.clientGroupsTitle() },
        ],
      },
    ],
    [currentLocale],
  )

  const menuConfig = useMemo(
    () => (isAdmin ? [profileMenuItem, ...adminMenuConfig] : [profileMenuItem]),
    [adminMenuConfig, currentLocale, isAdmin, profileMenuItem],
  )

  const fullName =
    displayName ??
    (user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '')
  const userInitial = (fullName || user?.firstName || user?.lastName || '?')
    .trim()
    .slice(0, 1)
    .toUpperCase()

  // Determine the default open sub-menu based on the current URL path
  const defaultOpenKeys = useMemo(() => {
    for (const item of adminMenuConfig) {
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

  const languageControl = (
    <Select<Locale>
      aria-label={m.layoutLanguage()}
      options={localeOptions}
      value={currentLocale}
      onChange={(locale) => {
        setLocale(locale, { reload: false })
        setCurrentLocale(locale)
      }}
      style={{ minWidth: 120 }}
    />
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Header className={styles.header}>
        <Space size="large" style={{ flex: 1 }}>
          <Link to="/" style={{ color: 'inherit' }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              IdentityLink
            </Typography.Title>
          </Link>

          {/* DESKTOP MENU: only show after we know admin status */}
          {md && !isLoading && !isPublicRoute && (
            <Menu
              mode="horizontal"
              selectedKeys={[selectedMenuKey]}
              defaultOpenKeys={defaultOpenKeys}
              items={menuConfig}
              onClick={handleMenuClick}
              style={{ borderBottom: 0, minWidth: 350 }}
            />
          )}
        </Space>

        {!isPublicRoute && (
        <Space size="middle">
          {!md && !isLoading && (
            <Button
              icon={<MenuOutlined />}
              type="text"
              onClick={() => setIsDrawerOpen(true)}
            />
          )}

          {md && fullName && <Typography.Text strong>{fullName}</Typography.Text>}
          {md && languageControl}
          <Avatar style={{ backgroundColor: '#1890ff' }}>{userInitial}</Avatar>

          {md && (
            <Button
              type="text"
              onClick={() => window.location.assign(BFF_LOGOUT_URL)}
            >
              {m.layoutSignOut()}
            </Button>
          )}
        </Space>
        )}
      </Layout.Header>

      {/* MOBILE DRAWER: Responsive menu */}
      <Drawer
        title={m.layoutMenu()}
        placement="right"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ padding: '16px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Typography.Text strong>{fullName}</Typography.Text>
            {languageControl}
          </Space>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedMenuKey]}
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
            {m.layoutSignOut()}
          </Button>
        </div>
      </Drawer>

      <Layout.Content className={styles.content} key={currentLocale}>
        <Outlet />
      </Layout.Content>
    </Layout>
  )
}

export default RootLayout
