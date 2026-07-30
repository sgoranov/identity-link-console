import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Input, Result, Space, Spin, Typography } from 'antd'
import { createGroup } from '../api/users/createGroup'
import { deleteGroup } from '../api/users/deleteGroup'
import { updateGroup } from '../api/users/updateGroup'
import { fetchGroups, groupsQueryKey } from '../api/users/fetchGroups'
import { fetchGroupUsers } from '../api/users/fetchGroupUsers'
import type { Group, QueryPayload } from '../api/types'
import { GroupFormDrawer, type GroupFormValues } from '../components/Users/GroupFormDrawer'
import { GroupTable } from '../components/Users/GroupTable'
import { showErrorNotification } from '../ui/notifications'
import { DEFAULT_PAGE_SIZE } from '../config'
import { m } from '../paraglide/messages'

const UserGroupsPage = () => {
  const queryClient = useQueryClient()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [page, setPage] = useState(0)
  const pageSize = DEFAULT_PAGE_SIZE
  const [orderBy, setOrderBy] = useState<Record<string, 'ASC' | 'DESC'>>({
    't.id': 'DESC',
  })
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [groupUserCounts, setGroupUserCounts] = useState<
    Record<string, { count: number; hasMore: boolean }>
  >({})
  const [groupUserCountsLoading, setGroupUserCountsLoading] = useState<
    Record<string, boolean>
  >({})

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput.trim())
      setPage(0)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  const groupsPayload: QueryPayload = {
    type: 'Group',
    alias: 't',
    limit: pageSize,
    offset: page * pageSize,
    orderBy,
    ...(searchTerm
      ? {
          query: 't.name LIKE :name',
          parameters: { name: `%${searchTerm}%` },
        }
      : {}),
  }

  const groupsQuery = useQuery({
    queryKey: groupsQueryKey(groupsPayload),
    queryFn: () => fetchGroups(groupsPayload),
  })

  if (groupsQuery.isLoading) {
    return (
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {m.userGroupsTitle()}
        </Typography.Title>
        <Space>
          <Spin />
          <Typography.Text>{m.groupsLoading()}</Typography.Text>
        </Space>
      </Space>
    )
  }

  if (groupsQuery.isError) {
    return (
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {m.userGroupsTitle()}
        </Typography.Title>
        <Result
          status="error"
          title={m.groupsUnableToLoad()}
          subTitle={
            groupsQuery.error instanceof Error
              ? groupsQuery.error.message
              : m.mainUnexpectedError()
          }
        />
      </Space>
    )
  }

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {m.userGroupsTitle()}
        </Typography.Title>
        <Button
          type="primary"
          onClick={() => {
            setDrawerMode('create')
            setSelectedGroup(null)
            setIsDrawerOpen(true)
          }}
        >
          {m.groupsCreate()}
        </Button>
      </div>
      <Typography.Paragraph>
        {m.userGroupsDescription()}
      </Typography.Paragraph>
      <Input
        placeholder={m.groupsSearchByName()}
        value={searchInput}
        allowClear
        onChange={(event) => setSearchInput(event.target.value)}
        style={{ maxWidth: 320 }}
      />
      <GroupTable
        groups={groupsQuery.data?.items ?? []}
        isLoading={groupsQuery.isLoading}
        deletingId={deletingId}
        groupUserCounts={groupUserCounts}
        groupUserCountsLoading={groupUserCountsLoading}
        onEdit={(group) => {
          if (group.isSystem) {
            showErrorNotification(m.groupsSystemCannotBeEditedWithPeriod(), {
              title: m.groupsEditBlocked(),
            })
            return
          }

          setDrawerMode('edit')
          setSelectedGroup(group)
          setIsDrawerOpen(true)
        }}
        onDeleteOpenChange={async (group, open) => {
          if (!open) return
          if (group.isSystem) return
          if (groupUserCounts[group.id] || groupUserCountsLoading[group.id]) return

          setGroupUserCountsLoading((current) => ({ ...current, [group.id]: true }))
          try {
            const data = await fetchGroupUsers(group.id)
            setGroupUserCounts((current) => ({
              ...current,
              [group.id]: { count: data.items.length, hasMore: data.hasMore },
            }))
          } catch (error) {
            showErrorNotification(
              error instanceof Error ? error.message : m.groupsUnableToCheckUsage(),
              { title: m.groupsUnableToCheckUsage() },
            )
          } finally {
            setGroupUserCountsLoading((current) => ({
              ...current,
              [group.id]: false,
            }))
          }
        }}
        onDelete={async (group) => {
          if (group.isSystem) {
            showErrorNotification(m.groupsSystemCannotBeDeleted(), {
              title: m.groupsDeleteBlocked(),
            })
            return
          }

          setDeletingId(group.id)
          try {
            await deleteGroup(group.id)
            setPage(0)
            await queryClient.invalidateQueries({ queryKey: ['groups.list'] })
          } catch (error) {
            showErrorNotification(
              error instanceof Error ? error.message : m.groupsUnableToDelete(),
              { title: m.groupsUnableToDelete() },
            )
          } finally {
            setDeletingId(null)
          }
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
          if (Object.keys(nextOrderBy).length === 0) {
            setOrderBy({ 't.id': 'DESC' })
            return
          }

          setOrderBy(nextOrderBy)
        }}
        sortOrderByField={{
          name:
            orderBy['t.name'] === 'ASC'
              ? 'ascend'
              : orderBy['t.name'] === 'DESC'
                ? 'descend'
                : undefined,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          disabled={page === 0 || groupsQuery.isFetching}
        >
          {m.mainPrevious()}
        </Button>
        <Button
          onClick={() => setPage((current) => current + 1)}
          disabled={!groupsQuery.data?.hasMore || groupsQuery.isFetching}
        >
          {m.mainNext()}
        </Button>
      </div>
      <GroupFormDrawer
        open={isDrawerOpen}
        mode={drawerMode}
        initialValues={selectedGroup ? { name: selectedGroup.name } : undefined}
        onClose={() => setIsDrawerOpen(false)}
        isSubmitting={isSubmitting}
        onSubmit={async (values: GroupFormValues) => {
          setIsSubmitting(true)
          try {
            if (drawerMode === 'create') {
              await createGroup(values)
              setPage(0)
              await queryClient.invalidateQueries({ queryKey: ['groups.list'] })
              setIsDrawerOpen(false)
              return
            }

            if (!selectedGroup) {
              throw new Error(m.groupsNoSelectedForUpdate())
            }

            if (selectedGroup.isSystem) {
              throw new Error(m.groupsSystemCannotBeEdited())
            }

            await updateGroup(selectedGroup.id, values)
            await queryClient.invalidateQueries({ queryKey: ['groups.list'] })
            setIsDrawerOpen(false)
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : m.groupsUnableToSave()
            showErrorNotification(errorMessage, { title: m.groupsUnableToSave() })
          } finally {
            setIsSubmitting(false)
          }
        }}
      />
    </Space>
  )
}

export default UserGroupsPage
