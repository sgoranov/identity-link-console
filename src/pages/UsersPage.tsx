import { useEffect, useMemo, useState } from 'react'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Input, Result, Select, Space, Typography, Spin } from 'antd'
import { createUser } from '../api/users/createUser'
import { deleteUser } from '../api/users/deleteUser'
import { updateUser } from '../api/users/updateUser'
import { fetchUsers, usersQueryKey } from '../api/users/fetchUsers'
import { fetchGroups, groupsQueryKey } from '../api/users/fetchGroups'
import { fetchUserGroups, userGroupsQueryKey } from '../api/users/fetchUserGroups'
import type { QueryPayload, Group } from "../api/types.ts"
import { UserTable } from "../components/Users/UserTable.tsx"
import { UserFormDrawer, type UserFormValues } from "../components/Users/UserFormDrawer.tsx"
import { showErrorNotification } from '../ui/notifications'
import { useUser } from '../hooks/useUser'
import { DEFAULT_PAGE_SIZE } from '../config'

const UsersPage = () => {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [page, setPage] = useState(0)
  const pageSize = DEFAULT_PAGE_SIZE
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')
  const [selectedUser, setSelectedUser] = useState<UserFormValues | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchField, setSearchField] = useState<'name' | 'email' | 'username'>('name')
  const [orderBy, setOrderBy] = useState<Record<string, 'ASC' | 'DESC'>>({})

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput.trim())
      setPage(0)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])
  const payload: QueryPayload = {
    type: 'User',
    alias: 't',
    limit: pageSize,
    offset: page * pageSize,
    ...(Object.keys(orderBy).length > 0 ? { orderBy } : {}),
    ...(searchTerm
      ? {
          query:
            searchField === 'email'
              ? 't.email LIKE :term'
              : searchField === 'username'
                ? 't.username LIKE :term'
                : '(t.firstName LIKE :term OR t.lastName LIKE :term)',
          parameters: { term: `%${searchTerm}%` },
        }
      : {}),
  };

  // 1. Users Query - returns a page with items + hasMore
  const usersQuery = useQuery({
    queryKey: usersQueryKey(payload),
    queryFn: () => fetchUsers(payload),
  })

  const { user: currentUser } = useUser()

  const groupsPayload: QueryPayload = {
    type: 'Group',
    alias: 't',
    limit: DEFAULT_PAGE_SIZE,
    orderBy: { 't.name': 'ASC' },
    offset: 0,
  };

  // 2. Groups Query - list for user form group selection
  const groupsQuery = useQuery({
    queryKey: groupsQueryKey(groupsPayload),
    queryFn: () => fetchGroups(groupsPayload),
  })

  const users = usersQuery.data?.items ?? []

  const userGroupsQueries = useQueries({
    queries: users.map((user) => ({
      queryKey: userGroupsQueryKey(user.username),
      queryFn: () => fetchUserGroups(user.username),
      enabled: Boolean(user.username),
    })),
  })

  const userGroupsByUsername = useMemo(() => {
    const entries = users.map((user, index) => [
      user.username,
      userGroupsQueries[index]?.data ?? [],
    ])
    return Object.fromEntries(entries)
  }, [userGroupsQueries, users])

  const isUserGroupsLoading = userGroupsQueries.some((query) => query.isLoading)

  // Safely extract the group list for the lookup table
  const groupList = groupsQuery.data?.items ?? [];

  if (usersQuery.isLoading) {
    return (
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>Users</Typography.Title>
        <Space><Spin /> <Typography.Text>Loading users…</Typography.Text></Space>
      </Space>
    )
  }

  if (usersQuery.isError) {
    return (
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>Users</Typography.Title>
        <Result
          status="error"
          title="Unable to load users"
          subTitle={usersQuery.error instanceof Error ? usersQuery.error.message : 'Unexpected error'}
        />
      </Space>
    )
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          Users
        </Typography.Title>
        <Button
          type="primary"
          onClick={() => {
            setDrawerMode('create')
            setSelectedUser(null)
            setIsCreateOpen(true)
          }}
        >
          Create user
        </Button>
      </div>
      <Typography.Paragraph>Manage user access and assignments here.</Typography.Paragraph>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Select
          value={searchField}
          onChange={(value) => {
            setSearchField(value)
            setPage(0)
          }}
          style={{ width: 160 }}
          options={[
            { value: 'name', label: 'Name' },
            { value: 'email', label: 'Email' },
            { value: 'username', label: 'Username' },
          ]}
        />
        <Input
          placeholder="Search users"
          value={searchInput}
          allowClear
          onChange={(event) => setSearchInput(event.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      <UserTable
        users={users}
        availableGroups={groupList}
        userGroupsByUsername={userGroupsByUsername}
        isLoading={usersQuery.isLoading || groupsQuery.isLoading || isUserGroupsLoading}
        deletingId={deletingId}
        currentUserId={currentUser?.id}
        sortOrderByField={{
          username:
            orderBy['t.username'] === 'ASC'
              ? 'ascend'
              : orderBy['t.username'] === 'DESC'
                ? 'descend'
                : undefined,
          email:
            orderBy['t.email'] === 'ASC'
              ? 'ascend'
              : orderBy['t.email'] === 'DESC'
                ? 'descend'
                : undefined,
        }}
        onSortChange={(sorter) => {
          const sorters = Array.isArray(sorter) ? sorter : [sorter]
          const nextOrderBy: Record<string, 'ASC' | 'DESC'> = {}

          sorters.forEach((sort) => {
            if (!sort.field || !sort.order) return
            const fieldName = String(sort.field)
            const key = `t.${fieldName}`
            nextOrderBy[key] = sort.order === 'ascend' ? 'ASC' : 'DESC'
          })

          setPage(0)
          setOrderBy(nextOrderBy)
        }}
        onEdit={(user) => {
          setDrawerMode('edit')
          setSelectedUser({
            username: user.username,
            password: '',
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            grantTypes: user.grantTypes,
            groups: userGroupsByUsername[user.username]?.map((group) => group.id) ?? [],
          })
          setIsCreateOpen(true)
        }}
        onDelete={async (user) => {
          if (!currentUser?.id) {
            showErrorNotification('Unable to determine current user.', {
              title: 'Delete user blocked',
            })
            return
          }

          if (currentUser.id === user.id) {
            showErrorNotification('You cannot delete your own account.', {
              title: 'Delete user blocked',
            })
            return
          }
          setDeletingId(user.id)
          try {
            await deleteUser(user.id)
            setPage(0)
            await queryClient.invalidateQueries({ queryKey: ['users.list'] })
          } catch (error) {
            showErrorNotification(
              error instanceof Error ? error.message : 'Unable to delete user',
              { title: 'Unable to delete user' },
            )
          } finally {
            setDeletingId(null)
          }
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          disabled={page === 0 || usersQuery.isFetching}
        >
          Previous
        </Button>
        <Button
          onClick={() => setPage((current) => current + 1)}
          disabled={!usersQuery.data?.hasMore || usersQuery.isFetching}
        >
          Next
        </Button>
      </div>

      <UserFormDrawer
        open={isCreateOpen}
        mode={drawerMode}
        availableGroups={groupList}
        initialValues={selectedUser ?? undefined}
        onClose={() => setIsCreateOpen(false)}
        isSubmitting={isSubmitting}
        onSubmit={async (values: UserFormValues) => {
          setIsSubmitting(true)
          try {
            if (drawerMode === 'create') {
              await createUser(values)
            } else {
              const targetId = users.find((user) => user.username === values.username)?.id
              if (!targetId) {
                throw new Error('Unable to locate user id for update')
              }

              await updateUser(targetId, {
                ...values,
                password: values.password || undefined,
              })
            }

            setPage(0)
            await queryClient.invalidateQueries({ queryKey: ['users.list'] })
            await queryClient.invalidateQueries({ queryKey: ['users.groups'] })
            setIsCreateOpen(false)
          } catch (error) {
            showErrorNotification(
              error instanceof Error ? error.message : 'Unable to save user',
              { title: 'Unable to save user' },
            )
          } finally {
            setIsSubmitting(false)
          }
        }}
      />
    </Space>
  )
}

export default UsersPage
